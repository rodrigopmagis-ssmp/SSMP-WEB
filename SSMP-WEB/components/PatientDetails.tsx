import React, { useState, useEffect } from 'react';
import { Patient, SurveyStatus, Procedure, ScriptStage, StageData, ClinicalNote, TreatmentLog } from '../types';
import { calculateDueDate, getSLAStatus, formatDueDate } from '../src/utils/sla';
import { supabaseService } from '../src/services/supabaseService';

interface PatientDetailsProps {
  patient: Patient;
  procedures: Procedure[];
  onBack: () => void;
  onEdit: () => void;
  onNewProtocol: () => void;
  selectedTreatmentId?: string; // Optional: ID of specific treatment to select
  onUpdate?: () => void;
}

const PatientDetails: React.FC<PatientDetailsProps> = ({ patient, procedures = [], onBack, onEdit, onNewProtocol, selectedTreatmentId, onUpdate }) => {
  if (!patient) return <div className="p-8 text-center text-gray-500">Carregando informações do paciente...</div>;

  const [treatments, setTreatments] = useState<any[]>([]);
  const [activeTreatment, setActiveTreatment] = useState<any>(null);
  const [loadingTreatments, setLoadingTreatments] = useState(true);

  // Re-introducing local state variables (synced with activeTreatment)
  const [surveyStatus, setSurveyStatus] = useState<SurveyStatus>(SurveyStatus.PENDING);
  const [surveySentAt, setSurveySentAt] = useState<string | undefined>(undefined);
  const [surveyRespondedAt, setSurveyRespondedAt] = useState<string | undefined>(undefined);

  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [expandedStage, setExpandedStage] = useState<string | null>('stage1');
  const [stageData, setStageData] = useState<Record<string, StageData>>({});

  const [isRegisteringResponse, setIsRegisteringResponse] = useState(false);
  const [tempResponse, setTempResponse] = useState<string>('');


  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mathChallenge, setMathChallenge] = useState({ n1: 0, n2: 0 });

  // Log State
  // Log State
  const [showLogs, setShowLogs] = useState(false);
  const [treatmentLogs, setTreatmentLogs] = useState<TreatmentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Procedure Details Modal State
  const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);

  const fetchLogs = async () => {
    if (!activeTreatment) return;
    setLoadingLogs(true);
    try {
      const logs = await supabaseService.getTreatmentLogs(activeTreatment.id);
      setTreatmentLogs(logs);
    } catch (error) {
      console.error('Error fetching logs', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenLogs = () => {
    setShowLogs(true);
    fetchLogs();
  };
  const [deleteAnswer, setDeleteAnswer] = useState('');

  // Clinical Notes State
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Fetch Notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const data = await supabaseService.getPatientNotes(patient.id);
        setNotes(data);
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    };
    loadNotes();
  }, [patient.id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const note = await supabaseService.createClinicalNote({
        patient_id: patient.id,
        content: newNote,
        created_by: 'Equipe' // Could get from auth user later
      });

      setNotes([note, ...notes]);
      setNewNote('');
      setIsAddingNote(false);
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Erro ao salvar nota.');
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

  const handleDeleteProtocol = async () => {
    if (!activeTreatment) return;

    // Validate Math Challenge
    const sum = mathChallenge.n1 + mathChallenge.n2;
    if (parseInt(deleteAnswer) !== sum) {
      alert('Resposta incorreta. O protocolo não foi excluído.');
      return;
    }

    if (!confirm('Tem certeza absoluta? Esta ação não pode ser desfeita e apagará todo o histórico deste protocolo.')) return;

    try {
      await supabaseService.deleteTreatment(activeTreatment.id);
      setIsDeleteModalOpen(false);
      // Reload treatments
      const data = await supabaseService.getPatientTreatments(patient.id);
      setTreatments(data);
      if (data.length > 0) {
        setActiveTreatment(data[0]);
      } else {
        setActiveTreatment(null);
      }
      // Also update patient status if needed? 
      // Ideally trigger a full refresh or update parent, but local update is good start.
      alert('Protocolo excluído com sucesso.');
    } catch (error: any) {
      console.error('Error deleting protocol:', error);
      alert('Erro ao excluir protocolo: ' + (error.message || JSON.stringify(error)));
    }
  };

  // Fetch treatments on mount
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const data = await supabaseService.getPatientTreatments(patient.id);
        setTreatments(data);
        if (data.length > 0) {
          // If selectedTreatmentId is provided, use it; otherwise default to most recent
          const treatmentToSelect = selectedTreatmentId
            ? data.find(t => t.id === selectedTreatmentId) || data[0]
            : data[0];
          setActiveTreatment(treatmentToSelect);
        }
      } catch (error) {
        console.error('Error loading treatments:', error);
      } finally {
        setLoadingTreatments(false);
      }
    };
    loadTreatments();
  }, [patient.id, selectedTreatmentId]);

  // Effect to update local state when active treatment changes
  useEffect(() => {
    if (activeTreatment) {
      setTasksCompleted(activeTreatment.tasksCompleted);
      setStageData(activeTreatment.stageData || {});
      setExpandedStage('stage' + (activeTreatment.tasksCompleted + 1));
      setSurveyStatus(activeTreatment.surveyStatus || SurveyStatus.PENDING);

      // Update survey dates if available
      if (activeTreatment.surveyData) {
        setSurveySentAt(activeTreatment.surveyData.sentAt);
        setSurveyRespondedAt(activeTreatment.surveyData.respondedAt);
      }
    }
  }, [activeTreatment]);

  // Find procedure definition for the ACTIVE treatment
  const currentProcedureDef = activeTreatment
    ? procedures.find(p => p.id === activeTreatment.procedureId || p.name === activeTreatment.procedureName)
    : null;

  const scripts: ScriptStage[] = activeTreatment?.scripts || currentProcedureDef?.scripts || [];

  const scriptText = `Olá ${patient.name.split(' ')[0]}, espero que esteja tendo um ótimo dia! ✨ Como está a região da aplicação hoje ? Notou algum roxinho ou inchaço ?\n\nLembre - se de evitar exposição solar e usar o protetor conforme conversamos.Poderia nos enviar uma foto rápida de como está a recuperação agora ? `;

  const handleCopyScript = (text: string, stageId: string) => {
    console.log('Tentando copiar script...');

    const fallbackCopyTextToClipboard = (text: string) => {
      var textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        var successful = document.execCommand('copy');
        if (successful) {
          setCopyFeedback(stageId);
          setTimeout(() => setCopyFeedback(null), 2000);
        } else {
          alert('Não foi possível copiar. Por favor, selecione e copie manualmente.');
        }
      } catch (err) {
        alert('Não foi possível copiar. Por favor, selecione e copie manualmente.');
      }
      document.body.removeChild(textArea);
    }

    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyFeedback(stageId);
        setTimeout(() => setCopyFeedback(null), 2000);
      })
      .catch((err) => {
        fallbackCopyTextToClipboard(text);
      });
  };

  const handleSendWhatsapp = (text: string) => {
    const encodedText = encodeURIComponent(text);
    const phone = patient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };



  // Helper to update stage data
  const updateStage = async (data: Partial<StageData>) => {
    if (!expandedStage) return;

    const newStageData = {
      ...stageData,
      [expandedStage]: {
        ...(stageData[expandedStage] || {}),
        ...data
      }
    };

    setStageData(newStageData);

    try {
      if (activeTreatment) {
        await supabaseService.updateTreatment(activeTreatment.id, {
          stageData: newStageData
        });

        // Update local active treatment state too so it reflects immediately
        setActiveTreatment((prev: any) => ({
          ...prev,
          stageData: newStageData
        }));
      }
    } catch (e) {
      console.error("Error persisting stage data", e);
    }
  };

  const handleCompleteTask = async () => {
    if (!activeTreatment) return;

    if (tasksCompleted < activeTreatment.totalTasks) {
      try {
        const newTasksCompleted = tasksCompleted + 1;
        const newProgress = Math.round((newTasksCompleted / activeTreatment.totalTasks) * 100);

        // Optimistic update
        setTasksCompleted(newTasksCompleted);
        setIsTaskOpen(false);
        setExpandedStage(`stage${newTasksCompleted + 1}`);
        setIsTaskOpen(true);

        const updatedTreatment = {
          ...activeTreatment,
          tasksCompleted: newTasksCompleted,
          progress: newProgress,
          status: newTasksCompleted === activeTreatment.totalTasks ? 'completed' : 'active'
        };
        setActiveTreatment(updatedTreatment);

        // Persist to DB (Treatment)
        await supabaseService.updateTreatment(activeTreatment.id, {
          tasksCompleted: newTasksCompleted,
          progress: newProgress,
          status: newTasksCompleted === activeTreatment.totalTasks ? 'completed' : 'active'
        });

        // Log action
        await supabaseService.createLog({
          treatment_id: activeTreatment.id,
          action: 'task_completed',
          description: `Concluiu a etapa ${newTasksCompleted}: ${activeTreatment.scripts?.[tasksCompleted]?.title || `Etapa ${newTasksCompleted}`}`,
          metadata: { stage: newTasksCompleted, task_index: tasksCompleted }
        });

        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        console.error("Failed to update patient task completion", error);
        alert("Erro ao salvar progresso.");
      }
    }
  };

  const handleToggleAction = async (actionId: string, checked: boolean) => {
    if (!expandedStage) return;

    const currentChecklist = stageData[expandedStage]?.checklist || {};
    const newChecklist = { ...currentChecklist, [actionId]: checked };

    await updateStage({ checklist: newChecklist });
  };

  // Check if all actions defined in the script for the CURRENT stage are completed
  // We need to find the script corresponding to the expandedStage
  // expandedStage is like 'stage1', 'stage2'. scripts array is 0-indexed.
  const currentStageIndex = expandedStage ? parseInt(expandedStage.replace('stage', '')) - 1 : -1;
  const currentScript = (currentStageIndex >= 0 && currentStageIndex < scripts.length) ? scripts[currentStageIndex] : null;

  // Photo State
  // State

  const [isRegisteringPhotoResponse, setIsRegisteringPhotoResponse] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Derived state from current stage data
  const currentStageData = (expandedStage && stageData[expandedStage]) || {};
  const currentChecklist = currentStageData.checklist || {};
  const messageSentAt = currentStageData.messageSentAt;
  const messageRespondedAt = currentStageData.messageRespondedAt;
  const hasResponded = currentStageData.hasResponded;
  const responseContent = currentStageData.responseContent;

  // Photo Derived State
  const photoRequestSentAt = currentStageData.photoRequestSentAt;
  const photoReceivedAt = currentStageData.photoReceivedAt;
  const photoStatus = currentStageData.photoStatus;
  const photoUrl = currentStageData.photoUrl;

  const handleRegisterPhotoRequest = async () => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    await updateStage({ photoRequestSentAt: formattedTime, photoStatus: 'pending' });

    if (activeTreatment) {
      await supabaseService.createLog({
        treatment_id: activeTreatment.id,
        action: 'photo_request_registered',
        description: `Registrou solicitação de foto na etapa ${expandedStage?.replace('stage', '')}`,
        metadata: { stage: expandedStage }
      });
    }
  };

  const handleRegisterPhotoResponse = () => setIsRegisteringPhotoResponse(true);

  const handleConfirmPhotoResponse = async (received: boolean) => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (received) {
      // We keep isRegisteringPhotoResponse = true to show the upload UI
    } else {
      await updateStage({
        photoStatus: 'refused',
        photoReceivedAt: formattedTime
      });
      setIsRegisteringPhotoResponse(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setUploadingPhoto(true);

    try {
      const url = await supabaseService.uploadPatientPhoto(patient.id, file);

      const now = new Date();
      const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      await updateStage({
        photoStatus: 'received',
        photoReceivedAt: formattedTime,
        photoUrl: url
      });

      // Update patient photos list in DB
      const newPhotos = [url, ...patient.photos];
      await supabaseService.updatePatient(patient.id, { photos: newPhotos });

      setIsRegisteringPhotoResponse(false);
    } catch (error) {
      console.error("Error uploading photo", error);
      alert('Erro ao enviar foto. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSendSurvey = async () => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    setSurveyStatus(SurveyStatus.SENT);
    setSurveySentAt(formattedTime);

    if (activeTreatment) {
      await supabaseService.updateTreatment(activeTreatment.id, {
        surveyStatus: SurveyStatus.SENT,
        surveyData: {
          ...activeTreatment.surveyData,
          status: SurveyStatus.SENT,
          sentAt: formattedTime
        }
      });
    }

    // Simulate opening WhatsApp for survey
    const encodedText = encodeURIComponent(`Olá ${patient.name.split(' ')[0]}! Gostaríamos muito de saber o que achou do seu tratamento. Poderia responder nossa rápida pesquisa? ⭐`);
    const phone = patient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };

  const handleRegisterSent = async () => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    await updateStage({ messageSentAt: formattedTime });

    if (activeTreatment) {
      await supabaseService.createLog({
        treatment_id: activeTreatment.id,
        action: 'manual_message_registered',
        description: `Registrou manualmente o envio de mensagem na etapa ${expandedStage?.replace('stage', '')}`,
        metadata: { stage: expandedStage }
      });
    }
  };

  const handleRegisterMessageResponse = () => {
    setIsRegisteringResponse(true);
  };

  const handleConfirmResponse = async (responded: boolean) => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (responded) {
      await updateStage({ hasResponded: true });
    } else {
      await updateStage({
        hasResponded: false,
        messageRespondedAt: formattedTime,
        responseContent: 'Paciente não respondeu ou não houve contato efetivo.'
      });
      setIsRegisteringResponse(false);
    }
  };

  const handleSaveResponseContent = async () => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    await updateStage({
      messageRespondedAt: formattedTime,
      responseContent: tempResponse
    });
    setIsRegisteringResponse(false);
  };

  const handleRegisterResponse = async () => {
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    setSurveyStatus(SurveyStatus.RESPONDED);
    setSurveyRespondedAt(formattedTime);

    if (activeTreatment) {
      await supabaseService.updateTreatment(activeTreatment.id, {
        surveyStatus: SurveyStatus.RESPONDED,
        surveyData: {
          ...activeTreatment.surveyData,
          status: SurveyStatus.RESPONDED,
          respondedAt: formattedTime
        }
      });
    }
  };

  // Logic to check if all necessary actions are done
  // If actions exist, check if all are true in currentChecklist
  // Also check if photo request is completed if applicable
  const needsPhoto = currentScript?.requestMedia || currentScript?.actions?.some(a => a.type === 'photo_request');
  const isPhotoComplete = !needsPhoto || (photoStatus === 'received' || photoStatus === 'refused');

  const isChecklistComplete = (currentScript?.actions
    ? currentScript.actions.filter(a => a.type !== 'message' && a.type !== 'photo_request').every(a => currentChecklist[a.id])
    : true) && isPhotoComplete;

  const isAllTasksCompleted = tasksCompleted === (activeTreatment?.totalTasks || patient.totalTasks);

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <button onClick={onBack} className="text-primary/70 dark:text-primary/50 text-sm font-medium hover:underline">Pacientes</button>
        <span className="text-gray-400 text-sm font-medium">/</span>
        <span className="text-gray-900 dark:text-white text-sm font-bold">{patient.name}</span>
      </div>

      <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-6 items-center">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-24 w-24 border-4 border-primary/10 shadow-lg"
              style={{ backgroundImage: `url(${patient.avatar || 'https://picsum.photos/200'})` }}
            ></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[#1b0d11] dark:text-white text-2xl font-extrabold tracking-tight">{patient.name}</h1>
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Acompanhamento Ativo</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">calendar_today</span>
                  Última Visita: {patient.lastVisit}
                </p>
                {patient.procedureDate && (
                  <p className="text-primary font-bold text-sm flex items-center gap-1 bg-primary/5 px-2 py-1 rounded w-fit">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    Procedimento: {patient.procedureDate}
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {patient.procedures.map((procedureName, index) => {
                  const isActive = activeTreatment?.procedureName === procedureName;

                  if (isActive) {
                    return (
                      <button
                        key={`${procedureName}-${index}`}
                        onClick={() => setIsProcedureModalOpen(true)}
                        className="flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-primary/10 px-3 border border-primary/20 hover:bg-primary/20 transition-colors group cursor-pointer"
                        title="Ver detalhes do procedimento"
                      >
                        <span className="material-symbols-outlined text-primary text-xs group-hover:scale-110 transition-transform">info</span>
                        <p className="text-primary text-xs font-bold underline decoration-primary/30 underline-offset-2">{procedureName}</p>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`${procedureName}-${index}`}
                      className="flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-gray-100 px-3 border border-gray-200 cursor-default opacity-80"
                      title="Procedimento realizado"
                    >
                      <p className="text-gray-500 text-xs font-medium">{procedureName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <button onClick={onNewProtocol} className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-xl">medical_services</span>
              <span>Novo Protocolo</span>
            </button>
            <button onClick={onEdit} className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold transition-all hover:bg-gray-200">
              <span className="material-symbols-outlined text-xl">edit</span>
              <span>Editar Perfil</span>
            </button>
            <button
              onClick={() => {
                const phone = patient.phone.replace(/\D/g, '');
                window.open(`https://wa.me/55${phone}`, '_blank');
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-[#25D366] text-white text-sm font-bold shadow-lg shadow-[#25D366]/20 hover:bg-[#25D366]/90 transition-all"
            >
              <span className="material-symbols-outlined text-xl text-white">chat</span>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {/* Procedure Details Modal */}
      {
        isProcedureModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 relative">
              <button
                onClick={() => setIsProcedureModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  <span className="material-symbols-outlined text-4xl">
                    {currentProcedureDef?.icon || 'medical_services'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentProcedureDef?.name || activeTreatment?.procedureName || 'Procedimento'}
                </h3>
                {currentProcedureDef?.created_at && (
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                    Criado em {new Date(currentProcedureDef.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line text-center">
                  {currentProcedureDef?.description || 'Nenhuma descrição disponível para este procedimento.'}
                </p>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setIsProcedureModalOpen(false)}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        (activeTreatment?.totalTasks || patient.totalTasks) === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-gray-400 text-3xl">medical_services</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum Protocolo Ativo</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">Este paciente ainda não possui um protocolo de acompanhamento definido. Inicie um novo tratamento para começar o monitoramento.</p>
            <button
              onClick={onNewProtocol}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Iniciar Novo Protocolo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-900 dark:text-white text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">timeline</span>
                  Sequência de Acompanhamento
                  <button
                    onClick={handleOpenLogs}
                    className="ml-2 p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold uppercase tracking-wider tooltip-trigger"
                    title="Ver Histórico"
                  >
                    <span className="material-symbols-outlined text-lg">history</span>
                    Log
                  </button>
                </h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleRequestDelete}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    title="Excluir este protocolo"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    Excluir
                  </button>
                  <span className="text-sm font-medium text-gray-500">{tasksCompleted} de {activeTreatment?.totalTasks || patient.totalTasks} Tarefas Concluídas</span>
                </div>
              </div>

              <div className="space-y-6 relative before:content-[''] before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-200 dark:before:bg-gray-800">
                {/* Render stages dynamically based on available scripts or totalTasks */}
                {Array.from({ length: (activeTreatment?.totalTasks || patient.totalTasks) }, (_, idx) => {
                  const stageNum = idx + 1;
                  const isCompleted = stageNum <= tasksCompleted;
                  const isActive = stageNum === tasksCompleted + 1;
                  const stageId = `stage${stageNum}`;

                  // Get script info for this stage if available
                  const scriptInfo = scripts[idx];

                  // Calculate SLA if we have procedure date and script timing
                  let slaStatus = 'ontime';
                  let dueDateFormatted = '';

                  if (patient.procedureDate && scriptInfo?.timing) {
                    try {
                      // Assuming procedureDate is YYYY-MM-DD HH:MM
                      // We might need to handle the format carefully
                      // In supabaseService we just saved it directly
                      const dueDate = calculateDueDate(patient.procedureDate, scriptInfo.timing);
                      slaStatus = getSLAStatus(dueDate);
                      dueDateFormatted = formatDueDate(dueDate);
                    } catch (e) {
                      console.error("Error calculating date", e);
                      dueDateFormatted = "Data inválida";
                    }
                  }

                  return (
                    <div key={stageId} className="relative pl-12">
                      {/* Stage Icon */}
                      <div className={`absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center text-white border-4 border-background-light dark:border-background-dark z-10 ${isCompleted
                        ? 'bg-green-500 shadow-sm'
                        : isActive
                          ? 'bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                          : 'bg-gray-300 dark:bg-gray-700'
                        }`}>
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-lg font-bold">check</span>
                        ) : (
                          <span className="text-sm font-bold">{stageNum}</span>
                        )}
                      </div>

                      {/* Unified Stage Card */}
                      <div className={`bg-white dark:bg-gray-900 rounded-xl border-2 shadow-md overflow-hidden transition-all duration-300 ${isActive
                        ? (slaStatus === 'late' ? 'border-red-400' : slaStatus === 'warning' ? 'border-orange-400' : 'border-primary/30')
                        : isCompleted
                          ? 'border-green-100 dark:border-green-900/30 opacity-75 hover:opacity-100'
                          : 'border-gray-100 dark:border-gray-700 opacity-60 hover:opacity-100'
                        }`}>
                        <div
                          className={`px-5 py-4 flex justify-between items-center border-b cursor-pointer transition-colors ${isActive
                            ? 'bg-primary/5 dark:bg-primary/10 border-primary/10 hover:bg-primary/10'
                            : isCompleted
                              ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'bg-gray-50/50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          onClick={() => setExpandedStage(expandedStage === stageId ? null : stageId)}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold text-base leading-none ${isActive ? 'text-primary' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                {scriptInfo ? scriptInfo.title : `Acompanhamento ${stageNum}`}
                              </h3>

                              {/* SLA/Status Badge */}
                              {isCompleted ? (
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-100 text-green-600">
                                  CONCLUÍDO
                                </span>
                              ) : isActive && dueDateFormatted ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${slaStatus === 'late' ? 'bg-red-100 text-red-600' :
                                  slaStatus === 'warning' ? 'bg-orange-100 text-orange-600' :
                                    'bg-green-100 text-green-600'
                                  }`}>
                                  {slaStatus === 'late' ? 'ATRASADO' :
                                    slaStatus === 'warning' ? 'VENCE EM 15 MIN' :
                                      'NO PRAZO'}
                                </span>
                              ) : !isActive && !isCompleted ? (
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-500">
                                  AGUARDANDO
                                </span>
                              ) : null}
                            </div>

                            <div className="flex gap-2 text-xs">
                              {isCompleted ? (
                                <p className="text-green-600/70 font-semibold uppercase tracking-wider">Finalizado</p>
                              ) : isActive ? (
                                <p className="text-primary/70 font-semibold uppercase tracking-wider">Em Andamento</p>
                              ) : (
                                <p className="text-gray-400 font-semibold uppercase tracking-wider">Futuro</p>
                              )}

                              {dueDateFormatted && (isActive || !isCompleted) && (
                                <span className="text-gray-500">• Vence: {dueDateFormatted}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2">
                              {isActive && (
                                <>
                                  <span className="text-xs font-bold text-gray-500">Status:</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isTaskOpen ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                    {isTaskOpen ? 'ABERTO' : 'CONCLUÍDO'}
                                  </span>
                                </>
                              )}
                            </span>
                            <span className="material-symbols-outlined text-gray-400 transform transition-transform duration-200" style={{ transform: expandedStage === stageId ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                          </div>
                        </div>

                        {expandedStage === stageId && (
                          <div className="p-5 animate-in slide-in-from-top-2 duration-200 cursor-default">

                            {/* Script Section - High Contrast */}
                            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-[#fcf8f9] dark:bg-gray-800/80 px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">chat_bubble</span>
                                  Script de WhatsApp
                                </label>
                                {isActive && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const textToCopy = scriptInfo?.template
                                          ? scriptInfo.template.replace('#NomePaciente', patient.name.split(' ')[0]).replace('#NomeClinica', 'Aesthetic Clinic')
                                          : scriptText;
                                        handleCopyScript(textToCopy, stageId);
                                      }}
                                      className="flex items-center gap-1.5 text-gray-700 hover:text-primary hover:bg-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-gray-300 hover:shadow-sm"
                                      title="Copiar texto"
                                    >
                                      <span className="material-symbols-outlined text-sm">{copyFeedback === stageId ? 'check' : 'content_copy'}</span>
                                      <span>{copyFeedback === stageId ? 'Copiado' : 'Copiar'}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const textToSend = scriptInfo?.template
                                          ? scriptInfo.template.replace('#NomePaciente', patient.name.split(' ')[0]).replace('#NomeClinica', 'Aesthetic Clinic')
                                          : scriptText;
                                        handleSendWhatsapp(textToSend);
                                      }}
                                      className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5c] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm transform hover:-translate-y-0.5"
                                    >
                                      <span className="material-symbols-outlined text-white text-sm">chat</span>
                                      <span>Enviar</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="p-5 bg-white dark:bg-gray-900/50">
                                <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed font-medium whitespace-pre-line select-text">
                                  {scriptInfo?.template
                                    ? scriptInfo.template.replace('#NomePaciente', patient.name.split(' ')[0]).replace('#NomeClinica', 'Aesthetic Clinic')
                                    : scriptText}
                                </p>
                              </div>
                            </div>

                            {/* Controle de Contato - High Contrast */}
                            <div className={`mb-6 p-4 rounded-xl border ${isCompleted ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-[#f4f7fa] dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'}`}>
                              <div className="flex justify-between items-start">
                                <div className="space-y-2 w-full">
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">manage_accounts</span>
                                    Controle de Contato
                                  </h5>

                                  {!messageSentAt ? (
                                    <div className="flex flex-col gap-3">
                                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200/50 shadow-sm">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                          <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
                                          {isActive ? "Aguardando envio da mensagem..." : "Nenhum contato registrado."}
                                        </p>
                                        {isActive && (
                                          <button
                                            onClick={handleRegisterSent}
                                            className="text-blue-700 hover:text-blue-900 text-xs font-bold flex items-center gap-1 hover:underline bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            Registrar Envio Manualmente
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-900/30 shadow-sm flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-700">
                                          <span className="material-symbols-outlined text-lg">check</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase">Status do Envio</p>
                                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            Mensagem enviada em {messageSentAt}
                                          </p>
                                        </div>
                                      </div>

                                      {!messageRespondedAt ? (
                                        !isRegisteringResponse ? (
                                          <div className="flex items-center justify-between pl-2 border-l-2 border-dashed border-gray-300 ml-4 py-2">
                                            <p className="text-xs font-bold text-gray-600 italic pl-2">Aguardando resposta do paciente...</p>
                                            {isActive && (
                                              <button
                                                onClick={handleRegisterMessageResponse}
                                                className="text-primary hover:text-primary-dark text-xs font-bold hover:underline flex items-center gap-1"
                                              >
                                                <span className="material-symbols-outlined text-sm">add_comment</span>
                                                Registrar Resposta
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-blue-900/30 shadow-md animate-in fade-in zoom-in duration-300">
                                            {hasResponded === null || hasResponded === undefined ? (
                                              <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">O paciente respondeu?</p>
                                                <div className="flex gap-3">
                                                  <button onClick={() => handleConfirmResponse(true)} className="flex-1 group bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all">
                                                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">thumb_up</span>
                                                    Sim, respondeu
                                                  </button>
                                                  <button onClick={() => handleConfirmResponse(false)} className="flex-1 group bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all">
                                                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">thumb_down</span>
                                                    Não respondeu
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-3">
                                                <label className="block text-xs font-bold text-gray-700 uppercase">Resumo da resposta</label>
                                                <textarea
                                                  className="w-full text-sm font-medium text-gray-900 border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-gray-50 p-3 min-h-[80px]"
                                                  placeholder="Digite o que o paciente disse..."
                                                  value={tempResponse}
                                                  onChange={(e) => setTempResponse(e.target.value)}
                                                ></textarea>
                                                <div className="flex justify-end gap-2 pt-2">
                                                  <button onClick={() => { updateStage({ hasResponded: null }); setIsRegisteringResponse(false); }} className="text-xs text-gray-600 font-bold px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                                  <button onClick={handleSaveResponseContent} className="text-xs bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all">Salvar Resposta</button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      ) : (
                                        <div className={`p-4 rounded-xl border flex items-start gap-3 ${hasResponded ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                                          <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${hasResponded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            <span className="material-symbols-outlined text-lg">{hasResponded ? 'forum' : 'unsubscribe'}</span>
                                          </div>
                                          <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${hasResponded ? 'text-green-800' : 'text-red-800'}`}>
                                              {hasResponded ? 'Paciente Respondeu' : 'Sem Resposta'}
                                            </p>
                                            {responseContent && <p className="text-sm text-gray-800 font-medium italic">"{responseContent}"</p>}
                                            <p className="text-[10px] text-gray-500 mt-2 font-bold">{messageRespondedAt}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Photo Control Section */}
                            {
                              (currentScript?.requestMedia || currentScript?.actions?.some(a => a.type === 'photo_request')) && (
                                <div className={`mb-6 p-4 rounded-xl border ${photoStatus === 'received' || photoStatus === 'refused' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30'}`}>
                                  <div className="space-y-2">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                                      Solicitação de Fotos
                                    </h5>

                                    {!photoRequestSentAt ? (
                                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-orange-200/50 shadow-sm">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                          <span className="size-2 rounded-full bg-orange-500 animate-pulse"></span>
                                          {isActive ? "Aguardando solicitação da foto..." : "Solicitação pendente."}
                                        </p>
                                        {isActive && (
                                          <button
                                            onClick={handleRegisterPhotoRequest}
                                            className="text-orange-700 hover:text-orange-900 text-xs font-bold flex items-center gap-1 hover:underline bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            Registrar Solicitação
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {/* Sent Status */}
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-orange-200 dark:border-orange-900/30 shadow-sm flex items-center gap-3">
                                          <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700">
                                            <span className="material-symbols-outlined text-lg">check</span>
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Solicitação Enviada</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                              Solicitado em {photoRequestSentAt}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Response Status */}
                                        {!photoStatus || photoStatus === 'pending' ? (
                                          !isRegisteringPhotoResponse ? (
                                            <div className="flex items-center justify-between pl-2 border-l-2 border-dashed border-gray-300 ml-4 py-2">
                                              <p className="text-xs font-bold text-gray-600 italic pl-2">Aguardando envio das fotos...</p>
                                              {isActive && (
                                                <button
                                                  onClick={handleRegisterPhotoResponse}
                                                  className="text-primary hover:text-primary-dark text-xs font-bold hover:underline flex items-center gap-1"
                                                >
                                                  <span className="material-symbols-outlined text-sm">add_a_photo</span>
                                                  Registrar Resposta
                                                </button>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-orange-200 dark:border-orange-900/30 shadow-md animate-in fade-in zoom-in duration-300">
                                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">As fotos foram enviadas?</p>
                                              <div className="flex gap-3 mb-4">
                                                <button onClick={() => { }} className="flex-1 group bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ring-2 ring-primary ring-offset-2">
                                                  <span className="material-symbols-outlined text-xl">check_circle</span>
                                                  Sim
                                                </button>
                                                <button onClick={() => handleConfirmPhotoResponse(false)} className="flex-1 group bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all opacity-50 hover:opacity-100">
                                                  <span className="material-symbols-outlined text-xl">cancel</span>
                                                  Não
                                                </button>
                                              </div>

                                              {/* Upload Area for YES */}
                                              <div className="mt-4 border-t border-gray-100 pt-4">
                                                <label className="block w-full cursor-pointer group">
                                                  <div className="border-2 border-dashed border-gray-300 group-hover:border-primary rounded-xl p-6 text-center transition-colors bg-gray-50 group-hover:bg-primary/5">
                                                    {uploadingPhoto ? (
                                                      <div className="flex flex-col items-center gap-2">
                                                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                                                        <span className="text-xs font-bold text-gray-500">Enviando foto...</span>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-primary text-3xl mb-2">cloud_upload</span>
                                                        <p className="text-xs font-bold text-gray-600 group-hover:text-primary mb-1">Clique para fazer upload (JPEG)</p>
                                                        <p className="text-[10px] text-gray-400">Máximo 5MB</p>
                                                      </>
                                                    )}
                                                  </div>
                                                  <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/jpeg,image/png,image/jpg"
                                                    onChange={handlePhotoUpload}
                                                    disabled={uploadingPhoto}
                                                  />
                                                </label>
                                                <button onClick={() => setIsRegisteringPhotoResponse(false)} className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700 font-bold">Cancelar</button>
                                              </div>
                                            </div>
                                          )
                                        ) : (
                                          <div className={`p-4 rounded-xl border flex items-start gap-3 ${photoStatus === 'received' ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                                            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${photoStatus === 'received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              <span className="material-symbols-outlined text-lg">{photoStatus === 'received' ? 'collections' : 'broken_image'}</span>
                                            </div>
                                            <div className="w-full">
                                              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${photoStatus === 'received' ? 'text-green-800' : 'text-red-800'}`}>
                                                {photoStatus === 'received' ? 'Fotos Recebidas' : 'Paciente não enviou'}
                                              </p>

                                              {photoUrl && (
                                                <div className="mt-2 relative group w-fit">
                                                  <div className="h-24 w-24 bg-cover bg-center rounded-lg border border-gray-200 shadow-sm" style={{ backgroundImage: `url(${photoUrl})` }}></div>
                                                  <a href={photoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg transition-opacity">
                                                    <span className="material-symbols-outlined">visibility</span>
                                                  </a>
                                                </div>
                                              )}

                                              <p className="text-[10px] text-gray-500 mt-2 font-bold">{photoReceivedAt}</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            <div className="grid md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-5 mt-2">
                              {scriptInfo?.actions && scriptInfo.actions.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">checklist</span>
                                    Checklist
                                  </h4>
                                  {scriptInfo.actions.filter(a => a.type !== 'message' && a.type !== 'photo_request').map(action => (
                                    <div key={action.id} onClick={() => isActive && handleToggleAction(action.id, !currentChecklist[action.id])} className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${isActive ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-200' : 'cursor-default'}`}>
                                      <div className={`size-5 rounded border flex items-center justify-center transition-all ${currentChecklist[action.id] ? 'bg-primary border-primary text-white' : 'border-gray-400 bg-white'}`}>
                                        {currentChecklist[action.id] && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                                      </div>
                                      <span className="text-sm font-bold text-gray-800">
                                        {action.description}
                                      </span>
                                    </div>
                                  ))}
                                  {scriptInfo.actions.filter(a => a.type !== 'message').length === 0 && (
                                    <p className="text-xs text-gray-400 italic pl-2">Nenhuma ação extra necessária.</p>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons - Only for Active Stage */}
                              {isActive && (
                                <div className="flex items-end justify-end">
                                  {!isAllTasksCompleted && (
                                    <button
                                      onClick={handleCompleteTask}
                                      disabled={!isTaskOpen || !isChecklistComplete || !messageRespondedAt}
                                      className={`px-6 py-3 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 transform active:scale-95 ${isTaskOpen && isChecklistComplete && messageRespondedAt
                                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-green-600/30'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                        }`}
                                    >
                                      <span className="material-symbols-outlined text-lg">check_circle</span>
                                      {isTaskOpen ? 'Concluir Etapa' : 'Concluído'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div >
                        )}
                      </div >
                    </div >
                  );
                })}


                {/* Pesquisa de Satisfação (Módulo Separado) */}
                {
                  currentProcedureDef?.hasSurvey && ((activeTreatment?.totalTasks || 0) >= scripts.length) && (
                    <div className={`relative pl-12 transition-all duration-500 ${isAllTasksCompleted ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                      <div className={`absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center text-white border-4 border-background-light dark:border-background-dark z-10 shadow-lg ${surveyStatus === SurveyStatus.RESPONDED ? 'bg-green-500' : 'bg-purple-600'}`}>
                        <span className="material-symbols-outlined text-lg">star</span>
                      </div>

                      <div className={`rounded-xl border-2 shadow-md overflow-hidden ${surveyStatus === SurveyStatus.RESPONDED ? 'bg-white dark:bg-gray-900 border-green-200' : 'bg-white dark:bg-gray-900 border-purple-100'}`}>
                        <div className={`px-5 py-4 flex justify-between items-center border-b ${surveyStatus === SurveyStatus.RESPONDED ? 'bg-green-50/50 border-green-100' : 'bg-purple-50/50 border-purple-100'}`}>
                          <div>
                            <h3 className={`${surveyStatus === SurveyStatus.RESPONDED ? 'text-green-700' : 'text-purple-700'} font-bold text-base leading-none mb-1`}>Pesquisa de Satisfação</h3>
                            <p className={`${surveyStatus === SurveyStatus.RESPONDED ? 'text-green-600' : 'text-purple-600'} text-xs font-semibold uppercase tracking-wider`}>
                              {surveyStatus === SurveyStatus.PENDING && 'Aguardando Finalização do Tratamento'}
                              {surveyStatus === SurveyStatus.SENT && `Enviado em ${surveySentAt}`}
                              {surveyStatus === SurveyStatus.RESPONDED && `Respondido em ${surveyRespondedAt}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${surveyStatus === SurveyStatus.PENDING ? 'bg-gray-100 text-gray-500' :
                              surveyStatus === SurveyStatus.SENT ? 'bg-purple-100 text-purple-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                              {surveyStatus === SurveyStatus.PENDING ? 'BLOQUEADO' :
                                surveyStatus === SurveyStatus.SENT ? 'AGUARDANDO' : 'CONCLUÍDO'}
                            </span>
                          </div>
                        </div>

                        {isAllTasksCompleted && (
                          <div className="p-5">
                            {surveyStatus === SurveyStatus.PENDING && (
                              <div className="flex flex-col gap-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  Todos os acompanhamentos foram concluídos! Agora é hora de enviar a pesquisa de satisfação para o paciente avaliar o tratamento.
                                </p>
                                <button
                                  onClick={handleSendSurvey}
                                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-600/20"
                                >
                                  <span className="material-symbols-outlined">send</span>
                                  <span>Enviar Pesquisa via WhatsApp</span>
                                </button>
                              </div>
                            )}

                            {surveyStatus === SurveyStatus.SENT && (
                              <div className="flex flex-col gap-4">
                                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4 border border-purple-100 dark:border-purple-900/30">
                                  <p className="text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
                                    <span className="material-symbols-outlined animate-pulse">mark_email_unread</span>
                                    Link da pesquisa enviado. Aguardando resposta do paciente...
                                  </p>
                                </div>
                                <button
                                  onClick={handleRegisterResponse}
                                  className="self-end text-purple-600 hover:text-purple-800 text-xs font-bold underline cursor-pointer"
                                >
                                  Simular: Registrar Resposta Agora
                                </button>
                              </div>
                            )}

                            {surveyStatus === SurveyStatus.RESPONDED && (
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Nota Geral</span>
                                  <div className="flex gap-1 text-amber-400">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <span key={star} className="material-symbols-outlined text-xl fill-current">star</span>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-900 p-3 rounded border border-gray-100 dark:border-gray-800">
                                  "O atendimento foi excelente! Adorei o resultado e a atenção da equipe durante todo o processo."
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
              </div >
            </div >

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4">Informações do Paciente</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                      <span className="material-symbols-outlined">call</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">WhatsApp</p>
                      <a className="text-gray-900 dark:text-white font-bold text-sm hover:text-primary" href={`tel:${patient.phone}`}>{patient.phone}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined">mail</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">E-mail</p>
                      <p className="text-gray-900 dark:text-white font-bold text-sm">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                      <span className="material-symbols-outlined">cake</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Data de Nascimento</p>
                      <p className="text-gray-900 dark:text-white font-bold text-sm">{patient.dob}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fotos Recentes</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {patient.photos.map((photo, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-center bg-cover border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundImage: `url(${photo})` }}
                      ></div>
                    ))}
                    <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors">
                      <span className="material-symbols-outlined">add</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 shadow-sm p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-primary font-bold text-lg">Notas da Equipe</h3>
                  <span className="material-symbols-outlined text-primary text-xl">sticky_note_2</span>
                </div>

                <div className="space-y-3 mb-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-4">Nenhuma nota registrada.</p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-primary/10 shadow-sm">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                          "{note.content}"
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-primary/60 uppercase">{note.created_by || 'Equipe'}</span>
                          <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isAddingNote ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <textarea
                      className="w-full text-sm p-3 rounded-lg border-2 border-primary/20 focus:border-primary outline-none bg-white dark:bg-gray-800 min-h-[80px]"
                      placeholder="Digite a nota..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      autoFocus
                    ></textarea>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAddingNote(false)}
                        className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        Salvar Nota
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="w-full py-2 bg-white dark:bg-gray-800 border border-primary/20 text-primary text-xs font-bold rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    ADICIONAR NOVA NOTA
                  </button>
                )}
              </div>
            </div>
          </div >
        )
      }
      {/* Delete Confirmation Modal */}
      {
        isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#f3e7ea] dark:border-[#3d242a]">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="size-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-3xl">warning</span>
                </div>
                <h3 className="text-xl font-bold text-[#1b0d11] dark:text-white">Excluir Protocolo?</h3>
                <p className="text-[#9a4c5f] dark:text-[#c4a1a9]">
                  Para confirmar a exclusão deste protocolo e de todo o histórico de acompanhamento, resolva a conta abaixo:
                </p>

                <div className="text-3xl font-black text-primary my-2 bg-primary/5 px-6 py-3 rounded-xl border border-primary/20">
                  {mathChallenge.n1} + {mathChallenge.n2} = ?
                </div>

                <input
                  type="number"
                  value={deleteAnswer}
                  onChange={(e) => setDeleteAnswer(e.target.value)}
                  placeholder="Resposta"
                  className="w-full text-center text-xl font-bold p-3 rounded-xl border-2 border-[#e7cfd5] dark:border-[#4d3239] focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  autoFocus
                />

                <div className="flex w-full gap-3 mt-4">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-3 font-bold text-[#9a4c5f] hover:bg-[#f3e7ea] dark:hover:bg-[#3d242a] rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteProtocol}
                    disabled={parseInt(deleteAnswer) !== (mathChallenge.n1 + mathChallenge.n2)}
                    className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Audit Log Modal */}
      {
        showLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  Histórico de Ações
                </h3>
                <button
                  onClick={() => setShowLogs(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-0">
                {loadingLogs ? (
                  <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
                    Carregando histórico...
                  </div>
                ) : treatmentLogs.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl opacity-50">history_toggle_off</span>
                    <p>Nenhuma ação registrada neste tratamento.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {treatmentLogs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 items-start">
                        <div className={`mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0 ${log.action.includes('completed') ? 'bg-green-100 text-green-600' :
                          log.action.includes('message') ? 'bg-blue-100 text-blue-600' :
                            log.action.includes('response') ? 'bg-purple-100 text-purple-600' :
                              'bg-gray-100 text-gray-600'
                          }`}>
                          <span className="material-symbols-outlined text-sm">
                            {log.action.includes('completed') ? 'check_circle' :
                              log.action.includes('message') ? 'chat' :
                                log.action.includes('response') ? 'forum' : 'info'}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-tight">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                            {log.metadata?.user_email && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1" title={log.metadata.user_email}>
                                  <span className="material-symbols-outlined text-[10px]">person</span>
                                  {log.metadata.user_email.split('@')[0]}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default PatientDetails;
