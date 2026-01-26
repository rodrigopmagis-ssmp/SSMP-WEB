import React, { useState, useEffect } from 'react';
import { Procedure, ScriptStage, TimingUnit } from '../types';
import { updateProcedure } from '../lib/procedures';
import { supabaseService } from '../src/services/supabaseService';
import Button from './ui/Button';
import StageEditor from './StageEditor';

interface ProceduresAdminProps {
  selectedProcedureId?: string | null;
  onSelectProcedure?: (id: string) => void;
  procedures: Procedure[];
  onUpdateProcedure?: (procedure: Procedure) => void;
  onDeleteProcedure?: (id: string) => void;
}

const ProceduresAdmin: React.FC<ProceduresAdminProps> = ({
  selectedProcedureId,
  onSelectProcedure,
  procedures,
  onUpdateProcedure,
  onDeleteProcedure
}) => {
  console.log('ProceduresAdmin rendering', { procedures, selectedProcedureId });

  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mathChallenge, setMathChallenge] = useState({ n1: 0, n2: 0 });
  const [deleteAnswer, setDeleteAnswer] = useState('');

  // Filter State
  const [showInactive, setShowInactive] = useState(false);

  // Header Edit State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({ name: '', icon: '', description: '' });

  const startEditingHeader = () => {
    if (!selectedProc) return;
    setHeaderForm({
      name: selectedProc.name,
      icon: selectedProc.icon,
      description: selectedProc.description
    });
    setIsEditingHeader(true);
  };

  const handleSaveHeader = async () => {
    if (!selectedProc) return;

    // Optimistic update
    const updatedProc = {
      ...selectedProc,
      name: headerForm.name,
      icon: headerForm.icon,
      description: headerForm.description
    };

    setSelectedProc(updatedProc);
    setIsEditingHeader(false);

    // Persist
    try {
      await supabaseService.updateProcedure(updatedProc);
      if (onUpdateProcedure) onUpdateProcedure(updatedProc);
    } catch (err) {
      console.error("Failed to update procedure details", err);
      alert("Erro ao salvar detalhes do procedimento.");
    }
  };

  // Select procedure when component mounts or procedures change
  useEffect(() => {
    console.log('Effect: procedures changed', procedures.length);
    if (procedures.length > 0) {
      const toSelect = selectedProcedureId
        ? procedures.find(p => p.id === selectedProcedureId) || procedures[0]
        : procedures[0];
      console.log('Selecting procedure:', toSelect);
      setSelectedProc(toSelect);
      if (onSelectProcedure && toSelect) {
        onSelectProcedure(toSelect.id);
      }
    }
  }, [procedures]);

  // Sync with selectedProcedureId from sidebar
  useEffect(() => {
    console.log('Effect: selectedProcedureId changed', selectedProcedureId);
    if (selectedProcedureId && procedures.length > 0) {
      const proc = procedures.find(p => p.id === selectedProcedureId);
      if (proc) {
        console.log('Syncing to procedure:', proc);
        // Only update if we are switching procedures or if the current one is not modified/dirty?
        // Or better: Checking if ID changed is safer to avoid overwriting local edits with stale/fresh data.
        if (selectedProc && selectedProc.id === proc.id) {
          // We are on the same procedure.
          // If we overwrite here, we lose any unsaved local state (like added stages that are in selectedProc but not in procedures prop yet).
          // However, if 'procedures' prop update comes from our OWN save, we WANT to update?
          // Actually, if we just saved, 'procedures' has the new data.
          // If we added a stage locally, selectedProc has MORE data than 'procedures' until we save.
          // So if we overwrite, we lose the added stage!
          // FIX: Do not overwrite if IDs match.
          return;
        }
        setSelectedProc(proc);
      }
    }
  }, [selectedProcedureId, procedures]);

  const handleSaveStage = (newStage: ScriptStage) => {
    if (!selectedProc) return;

    let updatedScripts: ScriptStage[];

    if (editingStageId) {
      // Update existing stage
      updatedScripts = selectedProc.scripts.map(s =>
        s.id === editingStageId ? newStage : s
      );
      setEditingStageId(null);
    } else {
      // Add new stage
      updatedScripts = [...selectedProc.scripts, newStage];
    }

    setSelectedProc({ ...selectedProc, scripts: updatedScripts });
    setIsAddingStage(false);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!selectedProc) return;
    if (!confirm('Tem certeza que deseja deletar este estágio?')) return;

    const updatedScripts = selectedProc.scripts.filter(s => s.id !== stageId);
    setSelectedProc({ ...selectedProc, scripts: updatedScripts });
  };

  const handleEditStage = (stageId: string) => {
    setEditingStageId(stageId);
    setIsAddingStage(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedProc) return;

    setSaving(true);
    console.log('ProceduresAdmin: handleSaveChanges called', selectedProc);
    try {
      if (onUpdateProcedure) {
        // @ts-ignore - We know it returns a promise in App.tsx
        await onUpdateProcedure(selectedProc);
      }
      alert('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Erro ao salvar alterações. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDelete = () => {
    setMathChallenge({
      n1: Math.floor(Math.random() * 9) + 1,
      n2: Math.floor(Math.random() * 9) + 1
    });
    setDeleteAnswer('');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteProcedure = async () => {
    if (!selectedProc) return;

    // Validate Math Challenge
    const sum = mathChallenge.n1 + mathChallenge.n2;
    if (parseInt(deleteAnswer) !== sum) {
      alert('Resposta incorreta. O procedimento não foi excluído.');
      return;
    }

    try {
      await supabaseService.deleteProcedure(selectedProc.id);
      setIsDeleteModalOpen(false);
      alert('Procedimento excluído com sucesso.');

      // Call parent callback to refresh list
      if (onDeleteProcedure) {
        onDeleteProcedure(selectedProc.id);
      }
    } catch (error: any) {
      console.error('Error deleting procedure:', error);
      alert(error.message || 'Erro ao excluir procedimento.');
    }
  };

  const handleToggleActive = async () => {
    if (!selectedProc) return;

    const newStatus = !selectedProc.is_active;
    const action = newStatus ? 'reativar' : 'inativar';

    if (!confirm(`Tem certeza que deseja ${action} o procedimento "${selectedProc.name}"?`)) return;

    try {
      const updated = await supabaseService.inactivateProcedure(selectedProc.id, newStatus);

      // Update local state
      setSelectedProc(updated);

      // Notify parent to update list
      if (onUpdateProcedure) {
        onUpdateProcedure(updated);
      }

      alert(`Procedimento ${newStatus ? 'reativado' : 'inativado'} com sucesso.`);
    } catch (error: any) {
      console.error('Error toggling procedure status:', error);
      alert(error.message || 'Erro ao alterar status do procedimento.');
    }
  };

  const handleTemplateChange = (stageId: string, newTemplate: string) => {
    if (!selectedProc) return;

    const updatedScripts = selectedProc.scripts.map(s =>
      s.id === stageId ? { ...s, template: newTemplate } : s
    );
    setSelectedProc({ ...selectedProc, scripts: updatedScripts });
  };

  const editingStage = editingStageId && selectedProc ? selectedProc.scripts.find(s => s.id === editingStageId) : null;

  const isEditing = isAddingStage || !!editingStageId;

  // Filter procedures based on showInactive
  const filteredProcedures = showInactive
    ? procedures
    : procedures.filter(p => p.is_active !== false);

  // Debug: mostrar se não há procedimentos
  if (filteredProcedures.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum Procedimento Encontrado</h3>
          <p className="text-gray-500 mb-6">Não há procedimentos disponíveis para configurar.</p>
        </div>
      </div>
    );
  }

  // Debug: mostrar se não há selected
  if (!selectedProc) {
    return (
      <div className="max-w-4xl mx-auto py-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Carregando...</h3>
          <p className="text-gray-500 mb-6">Selecionando procedimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
        <div className="flex flex-col gap-4 w-full md:w-2/3">
          {isEditingHeader ? (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-primary/20 shadow-lg animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Procedimento (Bloqueado)</label>
                    <input
                      value={headerForm.name}
                      disabled
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none"
                      title="O nome do procedimento não pode ser alterado"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary hover:underline">
                        Ícone (Google Fonts) <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        value={headerForm.icon}
                        onChange={e => setHeaderForm({ ...headerForm, icon: e.target.value })}
                        className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="Ex: face"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                        <span className="material-symbols-outlined text-xl">{headerForm.icon || 'help'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                  <textarea
                    value={headerForm.description}
                    onChange={e => setHeaderForm({ ...headerForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                    placeholder="Descrição curta do procedimento..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsEditingHeader(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveHeader}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition-all"
                  >
                    Salvar Detalhes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 group">
              <div className="flex items-start gap-4">
                <div className="size-14 rounded-2xl bg-white dark:bg-gray-800 border items-center justify-center flex shadow-sm text-primary shrink-0">
                  <span className="material-symbols-outlined text-3xl">{selectedProc.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                      {selectedProc.name}
                    </h1>
                    <button
                      onClick={startEditingHeader}
                      className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar nome e ícone"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xl">
                    {selectedProc.description || 'Sem descrição definida.'}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs font-medium text-gray-500 dark:text-gray-500">
                    {selectedProc.created_at && (
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        Criado em: {new Date(selectedProc.created_at).toLocaleDateString()}
                      </div>
                    )}
                    {selectedProc.updated_at && (
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px]">update</span>
                        Modificado: {new Date(selectedProc.updated_at).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[14px]">layers</span>
                      {selectedProc.scripts.length} etapas
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${selectedProc.is_active === false
              ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
              : 'text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100'
              }`}
            title={selectedProc.is_active === false ? 'Reativar este procedimento' : 'Inativar este procedimento'}
          >
            <span className="material-symbols-outlined text-base">
              {selectedProc.is_active === false ? 'check_circle' : 'block'}
            </span>
            {selectedProc.is_active === false ? 'Reativar' : 'Inativar'}
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={saving || isEditing}
            title={isEditing ? "Finalize a edição do estágio e clique em Salvar (verde) antes de salvar as alterações gerais." : ""}
            className={`flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 text-sm font-bold shadow-lg transition-all ${saving || isEditing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
              }`}
          >
            {saving ? 'Salvando...' : isEditing ? 'Finalize Edição' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-[48px_1fr] gap-x-6">
          {selectedProc.scripts.map((script, idx) => (
            <React.Fragment key={script.id}>
              <div className="flex flex-col items-center gap-1">
                <div className="bg-primary text-white rounded-full size-10 flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-xl">
                    {idx === 0 ? 'schedule' : 'light_mode'}
                  </span>
                </div>
                {(idx < selectedProc.scripts.length - 1 || isAddingStage || editingStageId) && <div className="w-[2px] bg-primary/30 h-full grow min-h-[20px]"></div>}
              </div>

              {editingStageId === script.id ? (
                <StageEditor
                  initialData={editingStage}
                  onSave={handleSaveStage}
                  onCancel={() => setEditingStageId(null)}
                />
              ) : (
                <div className="flex flex-1 flex-col pb-10">
                  <div className="bg-white dark:bg-[#2d181e] rounded-xl border border-[#f3e7ea] dark:border-[#3d242a] p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-[#1b0d11] dark:text-white text-lg font-bold">{script.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#9a4c5f] text-sm font-medium">
                            Atraso: {script.delay || (script.timing?.type === 'delay'
                              ? `${script.timing.delay?.value} ${script.timing.delay?.unit}`
                              : `${script.timing?.specific?.daysAfter} dias às ${script.timing?.specific?.time}`)}
                          </span>
                          <button
                            onClick={() => handleEditStage(script.id)}
                            className="material-symbols-outlined text-[#9a4c5f] text-xs cursor-pointer hover:text-primary transition-colors"
                          >
                            edit
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteStage(script.id)}
                          className="p-2 text-[#9a4c5f] hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold text-[#9a4c5f] uppercase tracking-wide">Modelo de Mensagem WhatsApp</label>
                      <div className="relative">
                        <textarea
                          className="w-full rounded-lg border-[#f3e7ea] dark:border-[#3a2228] bg-[#fcf8f9] dark:bg-black/20 text-sm focus:ring-primary focus:border-primary"
                          rows={4}
                          value={script.template}
                          onChange={(e) => handleTemplateChange(script.id, e.target.value)}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <button className="text-[10px] bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-2 py-1 rounded text-[#9a4c5f] hover:bg-primary hover:text-white transition-colors">#NomePaciente</button>
                          <button className="text-[10px] bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-2 py-1 rounded text-[#9a4c5f] hover:bg-primary hover:text-white transition-colors">#NomeClinica</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <input checked={script.autoSend} className="rounded text-primary focus:ring-primary border-[#f3e7ea]" type="checkbox" readOnly />
                          <span className="text-xs text-[#1b0d11] dark:text-white font-medium">Envio Automático</span>
                        </div>
                        {script.attachPdf && (
                          <div className="flex items-center gap-2 cursor-pointer">
                            <span className="material-symbols-outlined text-primary text-sm">attachment</span>
                            <span className="text-xs text-primary font-bold">Anexar PDF Pós-Op</span>
                          </div>
                        )}
                        {script.requestMedia && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 flex items-center gap-2 cursor-pointer">
                            <span className="material-symbols-outlined text-primary text-sm">photo_camera</span>
                            <span className="text-xs text-primary font-bold">Solicitar Foto de Resposta</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {isAddingStage ? (
          <div className="grid grid-cols-[48px_1fr] gap-x-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col items-center gap-1">
              <div className="bg-white border-2 border-primary text-primary rounded-full size-10 flex items-center justify-center shadow-md z-10">
                <span className="material-symbols-outlined text-xl">add</span>
              </div>
            </div>
            <StageEditor
              onSave={handleSaveStage}
              onCancel={() => setIsAddingStage(false)}
            />
          </div>
        ) : !editingStageId && (
          <button
            onClick={() => setIsAddingStage(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#f3e7ea] dark:border-[#3d242a] rounded-xl text-[#9a4c5f] font-bold hover:bg-white dark:hover:bg-[#3a2228] hover:border-primary/50 hover:text-primary transition-all group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
            <span>Adicionar Novo Estágio</span>
          </button>
        )}

        {!isAddingStage && !editingStageId && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                handleSaveStage({
                  id: Math.random().toString(36).substr(2, 9),
                  title: 'Pesquisa de Satisfação',
                  delay: 'Após o procedimento',
                  timing: { type: 'delay', delay: { value: 1, unit: 'dias' } },
                  template: 'Olá! Gostaríamos de saber como foi sua experiência conosco. Poderia responder brevemente?',
                  autoSend: true,
                  attachPdf: false,
                  requestMedia: false,
                  actions: [],
                  type: 'service_survey'
                });
              }}
              className="flex items-center justify-center gap-2 py-3 border border-dashed border-blue-200 bg-blue-50/50 rounded-xl text-blue-700 font-bold hover:bg-blue-100 hover:border-blue-300 transition-all group"
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">sentiment_satisfied</span>
              <span>Adicionar Pesquisa de Satisfação</span>
            </button>
            <button
              onClick={() => {
                handleSaveStage({
                  id: Math.random().toString(36).substr(2, 9),
                  title: 'Resultado Final',
                  delay: '30 dias depois',
                  timing: { type: 'delay', delay: { value: 30, unit: 'dias' } },
                  template: 'Olá! Já faz um tempo desde seu procedimento. Como estão os resultados? Poderia nos enviar uma foto?',
                  autoSend: true,
                  attachPdf: false,
                  requestMedia: true,
                  actions: [],
                  type: 'outcome_survey'
                });
              }}
              className="flex items-center justify-center gap-2 py-3 border border-dashed border-purple-200 bg-purple-50/50 rounded-xl text-purple-700 font-bold hover:bg-purple-100 hover:border-purple-300 transition-all group"
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">checklist</span>
              <span>Adicionar Pesquisa de Resultado</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Excluir Procedimento?</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                ⚠️ Você está prestes a excluir permanentemente o procedimento <strong>"{selectedProc?.name}"</strong>.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Para confirmar, resolva: {mathChallenge.n1} + {mathChallenge.n2} = ?
              </label>
              <input
                type="number"
                value={deleteAnswer}
                onChange={(e) => setDeleteAnswer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white"
                placeholder="Digite a resposta"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProcedure}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProceduresAdmin;
