import React from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { Patient, Procedure, PatientTreatment } from '../types';
import Button from './ui/Button';
import { CopilotView } from '../src/components/Copilot/CopilotView';

interface PatientProfileProps {
    patient: Patient;
    onBack: () => void;
    onEdit: () => void;
    onOpenProtocol: (treatmentId: string) => void;
    onNewProtocol: () => void;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ patient, onBack, onEdit, onOpenProtocol, onNewProtocol }) => {
    if (!patient) return <div className="p-8 text-center">Paciente não encontrado. <button onClick={onBack} className="text-primary underline">Voltar</button></div>;

    const [treatments, setTreatments] = React.useState<PatientTreatment[]>([]);
    const [loadingTreatments, setLoadingTreatments] = React.useState(true);
    const [patientTags, setPatientTags] = React.useState<any[]>([]);
    const [availableTags, setAvailableTags] = React.useState<any[]>([]);
    const [isTagMenuOpen, setIsTagMenuOpen] = React.useState(false);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = React.useState(false);
    const [complaintText, setComplaintText] = React.useState('');
    const [pendingTagId, setPendingTagId] = React.useState<string | null>(null);
    const [activeTagToRemove, setActiveTagToRemove] = React.useState<any>(null);
    const [isRemoveTagModalOpen, setIsRemoveTagModalOpen] = React.useState(false);
    const [showCopilot, setShowCopilot] = React.useState(false);

    React.useEffect(() => {
        supabaseService.getTags().then(tags => setAvailableTags(tags || []));
    }, []);

    React.useEffect(() => {
        supabaseService.getPatientTags(patient.id).then(tags => setPatientTags(tags || []));
    }, [patient.id]);

    const handleToggleTag = async (tag: any) => {
        const isAssigned = patientTags.some(t => t.id === tag.id);

        if (isAssigned) {
            setActiveTagToRemove(tag);
            setIsRemoveTagModalOpen(true);
        } else {
            // Add
            if (tag.name.toLowerCase().includes('reclamação')) {
                setPendingTagId(tag.id);
                setComplaintText('');
                setIsComplaintModalOpen(true);
                setIsTagMenuOpen(false);
                return;
            }

            try {
                await supabaseService.assignTag(patient.id, tag.id);
                const newTags = await supabaseService.getPatientTags(patient.id);
                setPatientTags(newTags);
            } catch (error) {
                console.error('Error assigning tag', error);
            }
        }
    };

    const handleSaveComplaint = async () => {
        if (!pendingTagId) return;
        try {
            await supabaseService.assignTag(patient.id, pendingTagId, { complaint: complaintText });
            const newTags = await supabaseService.getPatientTags(patient.id);
            setPatientTags(newTags);
            setIsComplaintModalOpen(false);
            setPendingTagId(null);
        } catch (error) {
            console.error('Error saving complaint tag', error);
        }
    };

    const handleConfirmRemoveTag = async () => {
        if (!activeTagToRemove) return;

        try {
            await supabaseService.removeTag(patient.id, activeTagToRemove.id);
            setPatientTags(prev => prev.filter(t => t.id !== activeTagToRemove.id));
            setIsRemoveTagModalOpen(false);
            setActiveTagToRemove(null);
        } catch (error) {
            console.error('Error removing tag', error);
            alert('Erro ao remover etiqueta.');
        }
    };

    React.useEffect(() => {
        const fetchTreatments = async () => {
            try {
                const data = await supabaseService.getPatientTreatments(patient.id);
                setTreatments(data);
            } catch (error) {
                console.error('Error fetching treatments:', error);
            } finally {
                setLoadingTreatments(false);
            }
        };
        fetchTreatments();
    }, [patient.id]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // 1. Upload file
            const publicUrl = await supabaseService.uploadAvatar(file);

            // 2. Update patient record
            await supabaseService.updatePatientAvatar(patient.id, publicUrl);

            // 3. Refresh
            window.location.reload();
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao fazer upload da imagem.');
        }
    };

    return (
        <div className="animate-in slide-in-from-right duration-500">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
            <div className="flex flex-wrap gap-2 items-center mb-6">
                <button onClick={onBack} className="text-primary/70 dark:text-primary/50 text-sm font-medium hover:underline">Pacientes</button>
                <span className="text-gray-400 text-sm font-medium">/</span>
                <span className="text-gray-900 dark:text-white text-sm font-bold">{patient.name}</span>
            </div>

            {/* Header Profile */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex gap-6 items-center">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-24 w-24 border-4 border-primary/10 shadow-lg cursor-pointer hover:opacity-80 transition-opacity relative group"
                            style={{ backgroundImage: `url(${patient.avatar || 'https://picsum.photos/200'})` }}
                            onClick={() => fileInputRef.current?.click()}
                            title="Clique para alterar a foto"
                        >
                            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white">cloud_upload</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-[#1b0d11] dark:text-white text-2xl font-extrabold tracking-tight">{patient.name}</h1>
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Ativo</span>
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                                <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-lg">mail</span>
                                    {patient.email}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-lg">call</span>
                                    {patient.phone}
                                </p>
                            </div>


                        </div>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
                        {/* Tags Display - Relocated */}
                        <div className="flex flex-wrap gap-2 justify-start md:justify-end animate-in slide-in-from-right duration-500 delay-150">
                            {patientTags.map(tag => (
                                <div
                                    key={tag.id}
                                    title={tag.metadata?.complaint ? `Reclamação: ${tag.metadata.complaint}` : 'Clique para remover'}
                                    className="group relative pl-4 pr-3 py-1.5 bg-white rounded-lg border shadow-sm transition-all duration-300 cursor-pointer flex items-center gap-2 select-none overflow-hidden hover:shadow-md hover:border-red-200"
                                    style={{
                                        borderColor: tag.color,
                                        color: tag.color
                                    }}
                                    onClick={() => handleToggleTag(tag)}
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1.5"
                                        style={{ backgroundColor: tag.color }}
                                    ></div>
                                    <span className="text-xs font-bold pl-1">
                                        {tag.name}
                                    </span>

                                    {tag.metadata?.complaint && (
                                        <span className="material-symbols-outlined text-[14px] text-red-500 bg-red-50 rounded-full p-0.5">warning</span>
                                    )}

                                    <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                        <span className="material-symbols-outlined text-red-600 font-bold">close</span>
                                    </div>
                                </div>
                            ))}

                            <div className="relative">
                                <button
                                    onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                                    className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                                    title="Adicionar Etiqueta"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>

                                {isTagMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsTagMenuOpen(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1a0f12] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 z-20 animate-in zoom-in-95 duration-200 origin-top-right">
                                            <p className="text-xs font-bold text-gray-400 px-2 py-1 mb-1 uppercase tracking-wider">Adicionar Etiqueta</p>
                                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                {availableTags.map(tag => {
                                                    const isActive = patientTags.some(t => t.id === tag.id);
                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() => handleToggleTag(tag)}
                                                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left group w-full"
                                                        >
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{tag.name}</span>
                                                            {isActive && <span className="material-symbols-outlined text-green-500 text-sm">check</span>}
                                                        </button>
                                                    );
                                                })}
                                                {availableTags.length === 0 && <p className="text-xs text-gray-400 p-2">Nenhuma etiqueta disponível.</p>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex w-full md:w-auto gap-3">
                            <button
                                onClick={() => setShowCopilot(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-purple-600 text-white text-sm font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all"
                                style={{ backgroundColor: '#7e22ce', color: '#ffffff' }}
                            >
                                <span className="material-symbols-outlined text-xl">psychology</span>
                                <span>Copiloto IA</span>
                            </button>
                            <button onClick={onEdit} className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold transition-all hover:bg-gray-200">
                                <span className="material-symbols-outlined text-xl">edit</span>
                                <span>Editar Dados</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>



            {
                showCopilot ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => setShowCopilot(false)}
                            className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            Voltar para Perfil
                        </button>
                        <CopilotView
                            patientId={patient.id}
                            onBack={() => setShowCopilot(false)}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Col: Registration Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    Dados Cadastrais
                                </h3>
                                <div className="space-y-6">

                                    {/* Pessoal */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 dark:border-gray-800 pb-1">Pessoal</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">cake</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Nascimento</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">wc</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Gênero</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">
                                                    {patient.gender === 'male' ? 'Masculino' :
                                                        patient.gender === 'female' ? 'Feminino' :
                                                            patient.gender === 'other' ? 'Outro' : 'Não informado'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">diversity_3</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Estado Civil</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.maritalStatus || 'Não informado'}</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">contrast</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Cor / Raça</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.race || 'Não informado'}</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">campaign</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Origem</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.origin || 'Não informado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Documentos */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 dark:border-gray-800 pb-1">Documentos</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">CPF</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.cpf || 'Não informado'}</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">fingerprint</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">RG</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.rg || 'Não informado'}</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">domain</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">CNPJ</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.cnpj || 'Não informado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profissional e Convênio */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 dark:border-gray-800 pb-1">Outros</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">work</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Profissão</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.profession || 'Não informado'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">medical_services</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Convênio</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.healthInsurance || 'Não informado'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">home</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Endereço</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 pl-6">{patient.address || 'Não informado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Right Col: Protocol History */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-gray-900 dark:text-white font-bold text-xl flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">history</span>
                                    Histórico de Protocolos
                                </h3>
                                <Button onClick={onNewProtocol} className="h-9 text-xs">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Novo Protocolo
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {/* Active & Past Protocols */}
                                {loadingTreatments ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Carregando histórico...</div>
                                ) : treatments.length === 0 ? (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                                        <p className="text-gray-400 font-medium">Nenhum protocolo registrado.</p>
                                    </div>
                                ) : (
                                    treatments.map((treatment) => (
                                        <div key={treatment.id} className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 ${treatment.status === 'completed' ? 'border-l-green-500 opacity-75 hover:opacity-100' : 'border-l-primary'} border-y border-r border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer group`} onClick={() => onOpenProtocol(treatment.id)}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors">{treatment.procedureName}</h4>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${treatment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                                                            {treatment.status === 'active' ? 'Em Andamento' : 'Concluído'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {treatment.status === 'active' ? 'Iniciado em' : 'Realizado em'} {new Date(treatment.startedAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">arrow_forward_ios</span>
                                            </div>
                                            {treatment.status === 'active' && (
                                                <div className="mt-4 flex items-center gap-4">
                                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                                                        <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                                                        {treatment.tasksCompleted} / {treatment.totalTasks} Etapas
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                                                        <span className="material-symbols-outlined text-sm text-green-500">sentiment_satisfied</span>
                                                        Status: No Prazo
                                                    </div>
                                                </div>
                                            )}
                                            {treatment.status === 'completed' && (
                                                <div className="mt-3 text-xs text-gray-500">
                                                    Finalizado com sucesso.
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Complaint Modal */}
            {
                isComplaintModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#1a0f12] rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold mb-4 text-[#1b0d11] dark:text-white">Registrar Reclamação</h3>
                            <textarea
                                className="w-full h-32 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                placeholder="Descreva a reclamação do paciente..."
                                value={complaintText}
                                onChange={e => setComplaintText(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setIsComplaintModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveComplaint}
                                    disabled={!complaintText.trim()}
                                    className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Remove Tag Confirmation Modal */}
            {
                isRemoveTagModalOpen && activeTagToRemove && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-[#f3e7ea] dark:border-[#3d242a]">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="size-14 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-1">
                                    <span className="material-symbols-outlined text-3xl">delete</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#1b0d11] dark:text-white">Remover Etiqueta?</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    Deseja remover a etiqueta <span className="font-bold" style={{ color: activeTagToRemove.color }}>"{activeTagToRemove.name}"</span> deste paciente?
                                </p>

                                <div className="flex w-full gap-3 mt-4">
                                    <button
                                        onClick={() => setIsRemoveTagModalOpen(false)}
                                        className="flex-1 py-2.5 font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#3d242a] rounded-xl transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmRemoveTag}
                                        className="flex-1 py-2.5 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-all text-sm"
                                    >
                                        Remover
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PatientProfile;
