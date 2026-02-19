import React, { useState, useEffect } from 'react';
import { SalesSidebar } from './SalesSidebar';
import { NegocioCard } from './NegocioCard';
import { NegocioDetailsModal } from './NegocioDetailsModal';
import { NovoNegocioModal } from './NovoNegocioModal';
import { CampaignManager } from './CampaignManager'; // NEW
import { useNegocios } from '../hooks/useNegocios';
import { Negocio, Estagio, Campaign } from '../types';
import { useSLAMonitor } from '../hooks/useSLAMonitor';
import { useAutoLoss } from '../hooks/useAutoLoss';
import { supabase } from '../lib/supabase';

// Cores para fallback se não houver cor no estágio
const DEFAULT_COLORS = [
  '#3B82F6', '#F59E0B', '#F97316', '#6366F1', '#10B981', '#8B5CF6', '#84CC16', '#10B981'
];

export function SalesPipeline() {
  const [currentView, setCurrentView] = useState<'kanban' | 'list'>('kanban');
  const [filtros, setFiltros] = useState<{
    search?: string;
    estagio?: Estagio | 'em_andamento';
    periodo?: string;
    origem?: string;
    assignedTo?: string;
  }>({
    search: '',
    estagio: undefined,
    periodo: 'hoje',
    origem: '',
    assignedTo: undefined
  });
  const [negocioSelecionado, setNegocioSelecionado] = useState<Negocio | null>(null);
  const [mostrarNovoNegocioModal, setMostrarNovoNegocioModal] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignManager, setShowCampaignManager] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const { negocios, loading, criarNegocio, atualizarNegocio, carregarNegocios } = useNegocios();
  const { violations, warnings } = useSLAMonitor(negocios);

  // Ativar serviço de auto-loss (limpeza automática)
  useAutoLoss();

  // Obter usuário atual
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          stages:campaign_stages(*)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      if (campaignsData) {
        // Sort stages by position
        const sortedCampaigns = campaignsData.map(c => ({
          ...c,
          stages: c.stages?.sort((a: any, b: any) => a.position - b.position)
        }));
        setCampaigns(sortedCampaigns);

        // Select first campaign by default if none selected
        if (sortedCampaigns.length > 0 && !selectedCampaign) {
          setSelectedCampaign(sortedCampaigns[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Filtragem local
  const negociosFiltrados = negocios.filter(n => {
    // 1. Filtrar por Campanha
    if (selectedCampaign) {
      if (n.campaign_id !== selectedCampaign.id) return false;
    }

    const leadName = n.lead?.name?.toLowerCase() || '';
    const searchTerm = filtros.search?.toLowerCase() || '';
    if (searchTerm && !leadName.includes(searchTerm)) return false;

    // Filtro por Vendedor (Meus Negócios)
    if (filtros.assignedTo === 'me' && currentUserId) {
      if (n.id_vendedor !== currentUserId) return false;
    }

    // Filtro por Estágio
    if (filtros.estagio) {
      if (filtros.estagio === 'em_andamento') {
        const isFinished = ['ganho', 'perdido'].includes(n.estagio as string); // basic check
        // Check dynamic stages for 'system_default' if feasible, but for now stick to strings or stage properties
        if (isFinished) return false;
      } else {
        // Match exato
        if (n.estagio !== filtros.estagio) return false;
      }
    }

    return true;
  });

  const getNegociosPorEstagioId = (stageId: string) => {
    return negociosFiltrados.filter(n => n.stage_id === stageId);
  };

  // Fallback compatibility
  const getNegociosPorEstagioKey = (estagioKey: string) => {
    return negociosFiltrados.filter(n => n.estagio === estagioKey);
  };

  const handleDragStart = (e: React.DragEvent, negocio: Negocio) => {
    e.dataTransfer.setData('negocioId', negocio.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, novoEstagioId: string) => {
    e.preventDefault();
    const negocioId = e.dataTransfer.getData('negocioId');
    const negocio = negocios.find(n => n.id === negocioId);

    if (negocio && negocio.stage_id !== novoEstagioId) {
      // Find the new stage to get its title for legacy compatibility if needed
      const stage = selectedCampaign?.stages?.find(s => s.id === novoEstagioId);

      await atualizarNegocio(negocioId, {
        ...negocio,
        stage_id: novoEstagioId,
        estagio: stage ? stage.title : negocio.estagio // Keep legacy sync if possible, or just ignore
      });
    }
  };

  const handleRefresh = () => {
    carregarNegocios();
    fetchCampaigns();
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <SalesSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        filters={filtros}
        onFiltersChange={setFiltros}
        onNewDeal={() => setMostrarNovoNegocioModal(true)}
        // Campaign Props
        campaigns={campaigns}
        selectedCampaign={selectedCampaign}
        onSelectCampaign={setSelectedCampaign}
        showSettings={true} // Allow opening settings (admin check inside Manager or just allowed)
        onOpenSettings={() => setShowCampaignManager(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {loading || loadingCampaigns ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/60 dark:border-primary/40"></div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">Carregando pipeline...</span>
          </div>
        ) : (
          <>
            {/* Novo Header da Pipeline - Design Refinado (User Mockup) */}
            <header className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-10">
              <div className="flex flex-col gap-6">

                {/* Linha Principal: Seletor de Campanha (Título) e Ações */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Lado Esquerdo: Seletor de Campanha como Título Principal */}
                  <div className="flex items-center gap-3">
                    {loadingCampaigns ? (
                      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <div className="relative group">
                        <select
                          className="appearance-none bg-transparent pr-10 py-1 text-2xl font-bold text-gray-900 dark:text-white border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer outline-none focus:border-blue-500 focus:ring-0"
                          value={selectedCampaign?.id || ''}
                          onChange={(e) => {
                            const cmp = campaigns.find(c => c.id === e.target.value);
                            if (cmp) setSelectedCampaign(cmp);
                          }}
                          aria-label="Selecionar Campanha"
                        >
                          {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {/* Ícone de Dropdown Customizado para maior visibilidade */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-600 transition-colors">
                          <span className="material-symbols-outlined text-[28px]">expand_more</span>
                        </div>
                      </div>
                    )}

                    {/* Botão de Configurações da Campanha */}
                    <button
                      onClick={() => setShowCampaignManager(true)}
                      className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      title="Configurar Campanha"
                    >
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                    </button>
                  </div>

                  {/* Lado Direito: Visualização e Ações */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* View Toggles */}
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex items-center">
                      <button
                        onClick={() => setCurrentView('kanban')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'kanban'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                        <span className="hidden sm:inline">Kanban</span>
                      </button>
                      <button
                        onClick={() => setCurrentView('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'list'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">list</span>
                        <span className="hidden sm:inline">Lista</span>
                      </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                    {/* Novo Negócio Primary Action */}
                    <button
                      onClick={() => setMostrarNovoNegocioModal(true)}
                      className="flex items-center gap-2 bg-[#9a4c5f] hover:bg-[#833a4c] text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                      <span className="hidden sm:inline">Novo Negócio</span>
                    </button>
                  </div>
                </div>

                {/* Cards de Métricas - Grid Responsivo (Melhor Distribuído) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Card Violações */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800/30 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                      <span className="material-symbols-outlined">warning</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-red-900/70 dark:text-red-400 uppercase tracking-wider">Violações</span>
                      <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">{violations.length}</span>
                    </div>
                  </div>

                  {/* Card Atenção */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800/30 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <span className="material-symbols-outlined">priority_high</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-orange-900/70 dark:text-orange-400 uppercase tracking-wider">Atenção</span>
                      <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">{warnings.length}</span>
                    </div>
                  </div>

                  {/* Card Total */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <span className="material-symbols-outlined">leaderboard</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-blue-900/70 dark:text-blue-400 uppercase tracking-wider">Total</span>
                      <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">{negocios.length}</span>
                    </div>
                  </div>

                  {/* Card Ganhos */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-900/70 dark:text-emerald-400 uppercase tracking-wider">Ganhos</span>
                      <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                        {negocios.filter(n => n.estagio === 'ganho').length}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 pt-1">
              {currentView === 'list' ? (
                // VIEW LISTA
                <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700/50 h-full overflow-y-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead / Negócio</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estágio</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contato</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Urgência</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {negociosFiltrados.map(negocio => (
                        <tr
                          key={negocio.id}
                          onClick={() => setNegocioSelecionado(negocio)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{negocio.lead?.name || 'Sem nome'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}>
                              {selectedCampaign?.stages?.find(s => s.id === negocio.stage_id)?.title || negocio.estagio}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {negocio.lead?.whatsapp}
                          </td>
                          <td className="p-4">
                            {negocio.lead?.ai_urgency ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase
                                                ${negocio.lead.ai_urgency === 'alta' ? 'bg-red-500' :
                                  negocio.lead.ai_urgency === 'média' ? 'bg-orange-500' : 'bg-green-500'}`
                              }>
                                {negocio.lead.ai_urgency}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-500">
                            {new Date(negocio.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {negociosFiltrados.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      Nenhum negócio encontrado com os filtros atuais.
                    </div>
                  )}
                </div>
              ) : (
                // VIEW KANBAN
                <div className="flex gap-3 h-full min-w-max pb-2">
                  {selectedCampaign?.stages?.map((stage, index) => {
                    const negociosDoEstagio = getNegociosPorEstagioId(stage.id);

                    // Color handling
                    const color = stage.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                    const stageStyle = `bg-gray-50 border-gray-200`; // Simplify base style, use inline for specific colors if needed
                    // Actually let's try to use the color for borders/bg tint
                    const customStyle = {
                      backgroundColor: `${color}08`, // very light tint
                      borderColor: `${color}40`
                    };

                    const isDragOver = dragOverColumn === stage.id;

                    const dragOverStyle = isDragOver ? {
                      borderColor: color,
                      boxShadow: `0 0 0 2px ${color}40`,
                      backgroundColor: `${color}15`
                    } : customStyle;

                    return (
                      <div
                        key={stage.id}
                        className={`flex flex-col w-[180px] max-w-[180px] h-full rounded-xl border transition-all duration-200 ${isDragOver ? 'scale-[1.01]' : ''}`}
                        style={dragOverStyle}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setDragOverColumn(stage.id)}
                        onDrop={(e) => {
                          handleDrop(e, stage.id);
                          setDragOverColumn(null);
                        }}
                      >
                        {/* Header da Coluna */}
                        <div className="p-2 border-b border-gray-200/50 dark:border-white/5 rounded-t-xl backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-base" style={{ color: color }}>
                              {/* Icon could be added to stage model, defaulting to 'circle' */}
                              circle
                            </span>
                            <span className="font-bold text-xs text-gray-800 dark:text-gray-100 uppercase tracking-wide flex-1 truncate">
                              {stage.title}
                            </span>
                            <span className="bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                              {negociosDoEstagio.length}
                            </span>
                          </div>
                        </div>

                        {/* Corpo da Coluna */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                          {negociosDoEstagio.map((negocio) => (
                            <NegocioCard
                              key={negocio.id}
                              negocio={negocio}
                              onDragStart={handleDragStart}
                              onDragEnd={() => setDragOverColumn(null)}
                              onClick={() => setNegocioSelecionado(negocio)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {(!selectedCampaign || !selectedCampaign.stages || selectedCampaign.stages.length === 0) && (
                    <div className="flex items-center justify-center w-full h-full text-gray-400">
                      <div className="text-center">
                        <p>Nenhuma etapa configurada nesta campanha.</p>
                        <button onClick={() => setShowCampaignManager(true)} className="text-blue-500 hover:underline mt-2">Configurar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {negocioSelecionado && (
        <NegocioDetailsModal
          negocio={negocioSelecionado}
          onClose={() => setNegocioSelecionado(null)}
          onUpdate={handleRefresh}
          campaignStages={selectedCampaign?.stages || []}
        />
      )}

      {mostrarNovoNegocioModal && (
        <NovoNegocioModal
          onClose={() => setMostrarNovoNegocioModal(false)}
          onSuccess={() => {
            setMostrarNovoNegocioModal(false);
            handleRefresh();
          }}
          selectedCampaign={selectedCampaign} // PASSING SELECTED CAMPAIGN
        />
      )}

      {showCampaignManager && (
        <CampaignManager onClose={() => {
          setShowCampaignManager(false);
          fetchCampaigns(); // Refresh after edit
        }} />
      )}
    </div>
  );
}
