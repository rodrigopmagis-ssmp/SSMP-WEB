import React from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { Patient, Procedure, PatientTreatment } from '../types';
import Button from './ui/Button';

interface PatientProfileProps {
    patient: Patient;
    onBack: () => void;
    onEdit: () => void;
    onOpenProtocol: (procedureName: string) => void;
    onNewProtocol: () => void;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ patient, onBack, onEdit, onOpenProtocol, onNewProtocol }) => {
    if (!patient) return <div className="p-8 text-center">Paciente não encontrado. <button onClick={onBack} className="text-primary underline">Voltar</button></div>;

    const [treatments, setTreatments] = React.useState<PatientTreatment[]>([]);
    const [loadingTreatments, setLoadingTreatments] = React.useState(true);

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
                    <div className="flex w-full md:w-auto gap-3">
                        <button onClick={onEdit} className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold transition-all hover:bg-gray-200">
                            <span className="material-symbols-outlined text-xl">edit</span>
                            <span>Editar Dados</span>
                        </button>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Registration Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">person</span>
                            Dados Cadastrais
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">CPF</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{patient.cpf || 'Não informado'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Data de Nascimento</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{patient.dob || 'Não informada'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Endereço</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rua Exemplo, 123 - São Paulo/SP</p>
                                {/* Mock address since it's not in Patient interface yet, or we assume it's there/add it later */}
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
                                <div key={treatment.id} className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 ${treatment.status === 'completed' ? 'border-l-green-500 opacity-75 hover:opacity-100' : 'border-l-primary'} border-y border-r border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer group`} onClick={() => onOpenProtocol(treatment.procedureName)}>
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
        </div>
    );
};

export default PatientProfile;
