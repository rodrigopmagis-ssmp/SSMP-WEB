import React, { useState, useEffect } from 'react';
import { SalesSidebar } from './SalesSidebar';
import { NegocioCard } from './NegocioCard';
import { NegocioDetailsModal } from './NegocioDetailsModal';
import { NovoNegocioModal } from './NovoNegocioModal';
import { useNegocios } from '../hooks/useNegocios';
import { Negocio, Estagio } from '../types';
import { useSLAMonitor } from '../hooks/useSLAMonitor';
import { useAutoLoss } from '../hooks/useAutoLoss';
import { supabase } from '../lib/supabase';

// Cores para os ícones e bordas, usadas também no background das colunas
const ESTAGIOS = [
  { key: 'lead_quiz', label: 'Lead Quiz', icon: 'quiz', color: '#3B82F6' },
  { key: 'em_atendimento', label: 'Em Atendimento', icon: 'support_agent', color: '#F59E0B' },
  { key: 'qualificado', label: 'Qualificado', icon: 'thumb_up', color: '#F97316' },
  { key: 'oferta_consulta', label: 'Oferta de Consulta', icon: 'local_offer', color: '#6366F1' },
  { key: 'consulta_aceita', label: 'Consulta Aceita', icon: 'event_available', color: '#10B981' },
  { key: 'consulta_paga', label: 'Consulta Paga', icon: 'paid', color: '#8B5CF6' },
  { key: 'consulta_realizada', label: 'Consulta Realizada', icon: 'medical_services', color: '#84CC16' },
  { key: 'ganho', label: 'Ganho', icon: 'check_circle', color: '#10B981' },
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
  }, []);

  // Filtragem local
  const negociosFiltrados = negocios.filter(n => {
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
        // Exclui ganhos e perdidos
        if (n.estagio === 'ganho' || n.estagio === 'perdido') return false;
      } else {
        // Match exato
        if (n.estagio !== filtros.estagio) return false;
      }
    }

    return true;
  });

  const getNegociosPorEstagio = (estagioKey: string) => {
    return negociosFiltrados.filter(n => n.estagio === estagioKey);
  };

  const handleDragStart = (e: React.DragEvent, negocio: Negocio) => {
    e.dataTransfer.setData('negocioId', negocio.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, novoEstagio: string) => {
    e.preventDefault();
    const negocioId = e.dataTransfer.getData('negocioId');
    const negocio = negocios.find(n => n.id === negocioId);

    if (negocio && negocio.estagio !== novoEstagio) {
      await atualizarNegocio(negocioId, { ...negocio, estagio: novoEstagio });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <SalesSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        filters={filtros}
        onFiltersChange={setFiltros}
        onNewDeal={() => setMostrarNovoNegocioModal(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/60 dark:border-primary/40"></div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">Carregando pipeline...</span>
          </div>
        ) : (
          <>
            {/* Header de Métricas (Compacto e Horizontal) */}
            <div className="px-4 pb-2 pt-3">
              <div className="grid grid-cols-4 gap-3">
                {/* Violações SLA */}
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 border border-red-100 dark:border-red-800/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
                      <span className="material-symbols-outlined text-sm">warning</span>
                    </div>
                    <span className="text-[10px] font-bold text-red-900/70 dark:text-red-400 uppercase tracking-wide leading-none">Violações</span>
                  </div>
                  <span className="text-lg font-black text-gray-800 dark:text-white leading-none">{violations.length}</span>
                </div>

                {/* Atenção */}
                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-2 border border-orange-100 dark:border-orange-800/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <span className="material-symbols-outlined text-sm">error</span>
                    </div>
                    <span className="text-[10px] font-bold text-orange-900/70 dark:text-orange-400 uppercase tracking-wide leading-none">Atenção</span>
                  </div>
                  <span className="text-lg font-black text-gray-800 dark:text-white leading-none">{warnings.length}</span>
                </div>

                {/* Total Negócios */}
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <span className="material-symbols-outlined text-sm">monitoring</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-900/70 dark:text-blue-400 uppercase tracking-wide leading-none">Total</span>
                  </div>
                  <span className="text-lg font-black text-gray-800 dark:text-white leading-none">{negocios.length}</span>
                </div>

                {/* Ganhos */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-2 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-900/70 dark:text-emerald-400 uppercase tracking-wide leading-none">Ganhos</span>
                  </div>
                  <span className="text-lg font-black text-gray-800 dark:text-white leading-none">
                    {negocios.filter(n => n.estagio === 'ganho').length}
                  </span>
                </div>
              </div>
            </div>

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
                              {ESTAGIOS.find(e => e.key === negocio.estagio)?.label || negocio.estagio}
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
                  {ESTAGIOS.map((estagio, index) => {
                    const negociosDoEstagio = getNegociosPorEstagio(estagio.key);

                    // Definição de cores de fundo específicas por coluna
                    const bgColors = [
                      'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/50', // Lead
                      'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/50', // Atendimento
                      'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/50', // Qualificado
                      'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/50', // Oferta
                      'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800/50', // Aceita
                      'bg-violet-50/50 border-violet-100 dark:bg-violet-900/10 dark:border-violet-800/50', // Paga
                      'bg-lime-50/50 border-lime-100 dark:bg-lime-900/10 dark:border-lime-800/50', // Realizada
                      'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/50', // Ganho
                    ];
                    const stageStyle = bgColors[index] || 'bg-gray-50 border-gray-200';
                    const isDragOver = dragOverColumn === estagio.key;

                    // Dynamic style for drag over
                    const dragOverStyle = isDragOver ? {
                      borderColor: estagio.color,
                      boxShadow: `0 0 0 2px ${estagio.color}40`, // 25% opacity ring
                      backgroundColor: `${estagio.color}10` // 6% opacity bg
                    } : {};

                    return (
                      <div
                        key={estagio.key}
                        className={`flex flex-col w-[180px] max-w-[180px] h-full rounded-xl border transition-all duration-200 ${stageStyle} ${isDragOver ? 'scale-[1.01]' : ''}`}
                        style={dragOverStyle}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setDragOverColumn(estagio.key)}
                        onDrop={(e) => {
                          handleDrop(e, estagio.key);
                          setDragOverColumn(null);
                        }}
                      >
                        {/* Header da Coluna */}
                        <div className="p-2 border-b border-gray-200/50 dark:border-white/5 rounded-t-xl backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-base" style={{ color: estagio.color }}>
                              {estagio.icon}
                            </span>
                            <span className="font-bold text-xs text-gray-800 dark:text-gray-100 uppercase tracking-wide flex-1 truncate">
                              {estagio.label}
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
          onUpdate={carregarNegocios}
        />
      )}

      {mostrarNovoNegocioModal && (
        <NovoNegocioModal
          onClose={() => setMostrarNovoNegocioModal(false)}
          onSuccess={() => {
            setMostrarNovoNegocioModal(false);
            carregarNegocios();
          }}
        />
      )}
    </div>
  );
}
