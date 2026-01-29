import React, { useState } from 'react';
import { cleanAndFormatScript } from '../src/utils/scriptFormatter';

// Import necessary types from types.ts or define locally if strictly UI
// Assuming we pass necessary data as props to decouple from Patient type

interface StageAction {
    id: string;
    description: string;
    type?: 'message' | 'photo_request';
}

interface ScriptInfo {
    template: string;
    actions?: StageAction[];
    requestMedia?: boolean;
}

interface StageData {
    checklist?: Record<string, boolean>;
    messageSentAt?: string;
    messageRespondedAt?: string;
    hasResponded?: boolean | null;
    responseContent?: string;
    photoRequestSentAt?: string;
    photoReceivedAt?: string;
    photoStatus?: 'pending' | 'received' | 'refused';
    photoUrl?: string;
}

interface ProtocolStageCardProps {
    stageId: string;
    stageNum: number;
    title: string;
    scriptInfo?: ScriptInfo;
    stageData: StageData;
    isActive: boolean;
    isCompleted: boolean;
    isSkipped: boolean;
    slaStatus?: 'late' | 'warning' | 'ok';
    dueDateFormatted?: string;
    patientName: string; // Used for script formatting
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdateStage: (updates: Partial<StageData>) => Promise<void>;

    // Specific Handlers (passed from parent to handle side effects like DB calls or notifications)
    onSendWhatsapp: (text: string) => void;
    onCopyScript: (text: string) => void;
    copyFeedback?: string | null; // ID of stage copied

    // Media Handlers
    onRegisterPhotoRequest?: () => Promise<void>;
    onRegisterPhotoResponse?: (received: boolean, url?: string) => Promise<void>;
    onUploadPhoto?: (file: File) => Promise<string>; // Returns URL
}

const ProtocolStageCard: React.FC<ProtocolStageCardProps> = ({
    stageId,
    stageNum,
    title,
    scriptInfo,
    stageData,
    isActive,
    isCompleted,
    isSkipped,
    slaStatus,
    dueDateFormatted,
    patientName,
    isExpanded,
    onToggleExpand,
    onUpdateStage,
    onSendWhatsapp,
    onCopyScript,
    copyFeedback,
    onRegisterPhotoRequest,
    onRegisterPhotoResponse,
    onUploadPhoto
}) => {
    const [isRegisteringResponse, setIsRegisteringResponse] = useState(false);
    const [tempResponse, setTempResponse] = useState('');
    const [isRegisteringPhotoResponse, setIsRegisteringPhotoResponse] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Derived state
    const checklist = stageData.checklist || {};
    const messageSentAt = stageData.messageSentAt;
    const messageRespondedAt = stageData.messageRespondedAt;
    const hasResponded = stageData.hasResponded;
    const responseContent = stageData.responseContent;
    const photoRequestSentAt = stageData.photoRequestSentAt;
    const photoStatus = stageData.photoStatus;
    const photoUrl = stageData.photoUrl;

    const isTaskOpen = !isCompleted && isActive;

    // Handlers
    const handleToggleAction = async (actionId: string, checked: boolean) => {
        const newChecklist = { ...checklist, [actionId]: checked };
        await onUpdateStage({ checklist: newChecklist });
    };

    const handleRegisterSent = async () => {
        const now = new Date();
        const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        await onUpdateStage({ messageSentAt: formattedTime });
    };

    const handleRegisterMessageResponse = () => {
        setTempResponse(responseContent || '');
        setIsRegisteringResponse(true);
    };

    const handleSaveResponseContent = async () => {
        if (!tempResponse.trim()) return;

        const now = new Date();
        const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        await onUpdateStage({
            hasResponded: true,
            responseContent: tempResponse,
            messageRespondedAt: formattedTime
        });
        setIsRegisteringResponse(false);
    };

    const handleConfirmResponse = async (responded: boolean) => {
        if (responded) {
            // If yes, stay in registering mode to enter details
        } else {
            const now = new Date();
            const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            await onUpdateStage({
                hasResponded: false,
                messageRespondedAt: formattedTime,
                responseContent: 'Não respondeu'
            });
            setIsRegisteringResponse(false);
        }
    };

    // Photo Handlers - Wrapper to handle UI state
    const handleRegisterPhotoRequestWrapper = async () => {
        if (onRegisterPhotoRequest) {
            await onRegisterPhotoRequest();
        } else {
            // Fallback local update if no external handler (e.g. simple state)
            const now = new Date();
            const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            await onUpdateStage({ photoRequestSentAt: formattedTime, photoStatus: 'pending' });
        }
    }

    const handleConfirmPhotoResponseWrapper = async (received: boolean) => {
        if (received) {
            // Wait for upload
        } else {
            if (onRegisterPhotoResponse) {
                await onRegisterPhotoResponse(false);
            } else {
                const now = new Date();
                const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
                await onUpdateStage({
                    photoStatus: 'refused',
                    photoReceivedAt: formattedTime
                });
            }
            setIsRegisteringPhotoResponse(false);
        }
    };

    const handlePhotoUploadWrapper = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !onUploadPhoto) return;
        const file = event.target.files[0];
        setUploadingPhoto(true);

        try {
            const url = await onUploadPhoto(file);
            // Verify if parent handles update or we do it
            if (onRegisterPhotoResponse) {
                await onRegisterPhotoResponse(true, url);
            } else {
                const now = new Date();
                const formattedTime = `${now.toLocaleDateString()} · ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
                await onUpdateStage({
                    photoStatus: 'received',
                    photoReceivedAt: formattedTime,
                    photoUrl: url
                });
            }
            setIsRegisteringPhotoResponse(false);
        } catch (error) {
            console.error("Upload error", error);
            alert("Erro no upload");
        } finally {
            setUploadingPhoto(false);
        }
    };


    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl border-2 shadow-md overflow-hidden transition-all duration-300 ${isSkipped
            ? 'border-amber-200 dark:border-amber-900/30 opacity-75 hover:opacity-100'
            : isActive
                ? (slaStatus === 'late' ? 'border-red-400' : slaStatus === 'warning' ? 'border-orange-400' : 'border-primary/30')
                : isCompleted
                    ? 'border-green-100 dark:border-green-900/30 opacity-75 hover:opacity-100'
                    : 'border-gray-100 dark:border-gray-700 opacity-60 hover:opacity-100'
            }`}>
            <div
                className={`px-5 py-4 flex justify-between items-center border-b cursor-pointer transition-colors ${isSkipped
                    ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    : isActive
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary/10 hover:bg-primary/10'
                        : isCompleted
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'bg-gray-50/50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                onClick={onToggleExpand}
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-base leading-none ${isSkipped
                            ? 'text-amber-700 dark:text-amber-400'
                            : isActive
                                ? 'text-primary'
                                : isCompleted
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {title || `Acompanhamento ${stageNum}`}
                        </h3>

                        {/* SLA/Status Badge */}
                        {isSkipped ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-600">
                                ETAPA PULADA
                            </span>
                        ) : isCompleted ? (
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
                        {isSkipped ? (
                            <p className="text-amber-600/70 font-semibold uppercase tracking-wider">Ignorado</p>
                        ) : isCompleted ? (
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
                    <span className="material-symbols-outlined text-gray-400 transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                </div>
            </div>

            {isExpanded && (
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
                                            const rawText = scriptInfo?.template || '';
                                            if (!rawText) return;
                                            const cleanText = cleanAndFormatScript(rawText, patientName.split(' ')[0]);
                                            onCopyScript(cleanText);
                                        }}
                                        className="flex items-center gap-1.5 text-gray-700 hover:text-primary hover:bg-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-gray-300 hover:shadow-sm"
                                        title="Copiar texto"
                                    >
                                        <span className="material-symbols-outlined text-sm">{copyFeedback === stageId ? 'check' : 'content_copy'}</span>
                                        <span>{copyFeedback === stageId ? 'Copiado' : 'Copiar'}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const rawText = scriptInfo?.template || '';
                                            if (!rawText) return;
                                            const cleanText = cleanAndFormatScript(rawText, patientName.split(' ')[0]);
                                            onSendWhatsapp(cleanText);
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
                                {cleanAndFormatScript(scriptInfo?.template || '', patientName.split(' ')[0])}
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
                                                                <button onClick={() => { setIsRegisteringResponse(false); setTempResponse(''); }} className="text-xs text-gray-600 font-bold px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
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
                        (scriptInfo?.requestMedia || scriptInfo?.actions?.some(a => a.type === 'photo_request')) && (
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
                                                    onClick={handleRegisterPhotoRequestWrapper}
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
                                                                onClick={() => setIsRegisteringPhotoResponse(true)}
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
                                                            <button onClick={() => handleConfirmPhotoResponseWrapper(false)} className="flex-1 group bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all opacity-50 hover:opacity-100">
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
                                                                    onChange={handlePhotoUploadWrapper}
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
                        {scriptInfo?.actions && Array.isArray(scriptInfo.actions) && scriptInfo.actions.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">checklist</span>
                                    Checklist
                                </h4>
                                {scriptInfo.actions.filter(a => a.type !== 'message' && a.type !== 'photo_request').map(action => (
                                    <div key={action.id} onClick={() => isActive && handleToggleAction(action.id, !checklist[action.id])} className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${isActive ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-200' : 'cursor-default'}`}>
                                        <div className={`size-5 rounded border flex items-center justify-center transition-all ${checklist[action.id] ? 'bg-primary border-primary text-white' : 'border-gray-400 bg-white'}`}>
                                            {checklist[action.id] && <span className="material-symbols-outlined text-sm font-bold">check</span>}
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProtocolStageCard;
