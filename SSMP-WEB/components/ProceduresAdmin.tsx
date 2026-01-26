import React, { useState, useEffect } from 'react';
import { Procedure, ScriptStage, TimingUnit } from '../types';
import { updateProcedure } from '../lib/procedures';
import Button from './ui/Button';
import StageEditor from './StageEditor';

interface ProceduresAdminProps {
  selectedProcedureId?: string | null;
  onSelectProcedure?: (id: string) => void;
  procedures: Procedure[];
  onUpdateProcedure?: (procedure: Procedure) => void;
}

const ProceduresAdmin: React.FC<ProceduresAdminProps> = ({
  selectedProcedureId,
  onSelectProcedure,
  procedures,
  onUpdateProcedure
}) => {
  console.log('ProceduresAdmin rendering', { procedures, selectedProcedureId });

  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleTemplateChange = (stageId: string, newTemplate: string) => {
    if (!selectedProc) return;

    const updatedScripts = selectedProc.scripts.map(s =>
      s.id === stageId ? { ...s, template: newTemplate } : s
    );
    setSelectedProc({ ...selectedProc, scripts: updatedScripts });
  };

  const editingStage = editingStageId && selectedProc ? selectedProc.scripts.find(s => s.id === editingStageId) : null;

  const isEditing = isAddingStage || !!editingStageId;

  // Debug: mostrar se não há procedimentos
  if (procedures.length === 0) {
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
        <div className="flex flex-col gap-2">

          {/* ... (header code) ... */}

        </div>
        <div className="flex gap-3">
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
    </div>
  );
};

export default ProceduresAdmin;
