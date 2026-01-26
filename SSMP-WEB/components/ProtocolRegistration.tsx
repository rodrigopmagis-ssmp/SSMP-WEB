
import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus, Procedure, SurveyStatus, PatientTreatment } from '../types';
import { supabaseService } from '../src/services/supabaseService';
import Input from './ui/Input';
import Button from './ui/Button';

interface ProtocolRegistrationProps {
    patient: Patient;
    onSave: (updatedPatient: Patient) => void;
    onCancel: () => void;
}

const ProtocolRegistration: React.FC<ProtocolRegistrationProps> = ({ patient, onSave, onCancel }) => {
    const [loading, setLoading] = useState(true);
    const [proceduresList, setProceduresList] = useState<Procedure[]>([]);
    const [formData, setFormData] = useState({
        procedures: [] as string[],
        selectedProtocolId: '',
        procedureDate: new Date().toISOString().split('T')[0],
        procedureTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    });

    const [existingTreatments, setExistingTreatments] = useState<PatientTreatment[]>([]);

    // Fetch procedures & existing treatments on mount
    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [proceduresData, treatmentsData] = await Promise.all([
                    supabaseService.getProcedures(true), // Load only ACTIVE procedures
                    supabaseService.getPatientTreatments(patient.id)
                ]);
                setProceduresList(proceduresData);
                setExistingTreatments(treatmentsData);
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Erro ao carregar dados iniciais');
            } finally {
                setLoading(false);
            }
        };
        loadInitData();
    }, [patient.id]);

    // Encontrar o objeto do protocolo selecionado
    const selectedProtocol = proceduresList.find(p => p.id === formData.selectedProtocolId);

    // Calcular total de tarefas
    const totalTasks = selectedProtocol ? selectedProtocol.scripts.length : 0;

    // Efeito para definir protocolo padrão
    useEffect(() => {
        if (formData.procedures.length === 1 && !formData.selectedProtocolId) {
            const proc = proceduresList.find(p => p.name === formData.procedures[0]);
            if (proc && proc.scripts?.length > 0) {
                setFormData(prev => ({ ...prev, selectedProtocolId: proc.id }));
            }
        }
    }, [formData.procedures, proceduresList]);

    const handleProcedureToggle = (procName: string) => {
        const newProcedures = formData.procedures.includes(procName)
            ? formData.procedures.filter(p => p !== procName)
            : [...formData.procedures, procName];

        let newProtocolId = formData.selectedProtocolId;

        const removedProc = proceduresList.find(p => p.name === procName);
        if (formData.procedures.includes(procName) && removedProc && removedProc.id === formData.selectedProtocolId) {
            newProtocolId = '';
        }

        setFormData({ ...formData, procedures: newProcedures, selectedProtocolId: newProtocolId });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const availableProtocols = proceduresList.filter(p =>
            formData.procedures.includes(p.name) && p.scripts?.length > 0
        );

        if (availableProtocols.length > 0 && !formData.selectedProtocolId) {
            alert('Por favor, selecione qual protocolo de acompanhamento deve ser seguido.');
            return;
        }

        // Check for duplicate active protocols
        const duplicate = existingTreatments.find(t =>
            (t.procedureId === formData.selectedProtocolId || t.procedureName === formData.procedures[0]) &&
            t.status === 'active'
        );

        if (duplicate) {
            alert(`Este paciente já possui um protocolo ativo para "${duplicate.procedureName}". Conclua o atual antes de iniciar um novo.`);
            return;
        }

        try {
            // Create new treatment record (History supported!)
            await supabaseService.createTreatment({
                patientId: patient.id,
                procedureId: formData.selectedProtocolId,
                procedureName: formData.procedures[0], // Assuming single selection for now or primary
                startedAt: `${formData.procedureDate} ${formData.procedureTime}`,
                status: 'active',
                tasksCompleted: 0,
                totalTasks: totalTasks,
                progress: 0,
                progress: 0,
                stageData: {},
                surveyStatus: SurveyStatus.PENDING,
                scripts: selectedProtocol?.scripts || [] // Snapshot dos scripts
            });

            // Still update patient last visit/procedure date for quick access
            // But we do NOT overwrite progress/status here anymore, as that lives in the treatment
            // Merge new procedures with existing ones, avoiding duplicates
            const currentProcedures = patient.procedures || [];
            const newProcedures = Array.from(new Set([...currentProcedures, ...formData.procedures]));

            const updatedPatient = await supabaseService.updatePatient(patient.id, {
                procedures: newProcedures, // Save the merged list
                procedureDate: `${formData.procedureDate} ${formData.procedureTime}`,
                lastVisit: formData.procedureDate,
            });

            onSave(updatedPatient);
        } catch (error) {
            console.error('Error updating patient:', error);
            alert('Erro ao salvar protocolo');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1b0d11] dark:text-white">Novo Protocolo</h1>
                    <p className="text-[#9a4c5f] dark:text-[#c4a1a9]">Defina o tratamento para <span className="font-bold text-primary">{patient.name}</span></p>
                </div>
                <Button variant="ghost" onClick={onCancel} className="rounded-full !p-2">
                    <span className="material-symbols-outlined text-2xl">close</span>
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] p-8">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">medical_information</span>
                        Procedimento & Recuperação
                    </h2>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-[#1b0d11] dark:text-white">Procedimentos Realizados</span>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl border border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a]">
                                {proceduresList.map(proc => (
                                    <label key={proc.id} className={`flex items - center gap - 3 cursor - pointer p - 3 rounded - lg transition - all border ${formData.procedures.includes(proc.name) ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'} `}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-primary focus:ring-primary size-5"
                                            checked={formData.procedures.includes(proc.name)}
                                            onChange={() => handleProcedureToggle(proc.name)}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#1b0d11] dark:text-gray-200">{proc.name}</span>
                                            {proc.scripts?.length > 0 && (
                                                <span className="text-[10px] text-[#9a4c5f]">{proc.scripts.length} estágios</span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Data do Procedimento"
                                required
                                type="date"
                                value={formData.procedureDate}
                                onChange={e => setFormData({ ...formData, procedureDate: e.target.value })}
                            />
                            <Input
                                label="Hora do Procedimento"
                                required
                                type="time"
                                value={formData.procedureTime}
                                onChange={e => setFormData({ ...formData, procedureTime: e.target.value })}
                            />
                        </div>

                        {/* Seleção de Protocolo Principal (Só aparece se tiver procedimentos selecionados que tenham protocolos) */}
                        {proceduresList.some(p => formData.procedures.includes(p.name) && p.scripts?.length > 0) && (
                            <div className="mt-4 p-5 bg-[#fff5f7] dark:bg-[#3d242a] rounded-xl border-l-4 border-primary animate-in fade-in slide-in-from-top-2">
                                <h3 className="text-sm font-bold text-[#1b0d11] dark:text-white mb-3">
                                    📋 Qual protocolo de acompanhamento seguir?
                                </h3>

                                <div className="space-y-3">
                                    {proceduresList
                                        .filter(p => formData.procedures.includes(p.name) && p.scripts?.length > 0)
                                        .map(proc => (
                                            <label key={proc.id} className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="selectedProtocol"
                                                    className="text-primary focus:ring-primary"
                                                    checked={formData.selectedProtocolId === proc.id}
                                                    onChange={() => setFormData({ ...formData, selectedProtocolId: proc.id })}
                                                />
                                                <div className="flex-1 p-3 bg-white dark:bg-[#2d181e] rounded-lg border border-[#f3e7ea] dark:border-[#4d3239] group-hover:border-primary/50 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-sm text-[#1b0d11] dark:text-white">Protocolo {proc.name}</span>
                                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                                                            {proc.scripts.length} etapas
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-[#9a4c5f] mt-1">
                                                        Check-ins: {proc.scripts.map(s => s.delay).join(', ')}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Exibição de Resumo Automático */}
                        {selectedProtocol && (
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-gray-400">Total calculado</div>
                                        <div className="font-bold text-[#1b0d11] dark:text-white">{totalTasks} Acompanhamentos</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fotos Iniciais */}
                <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] p-8">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">photo_camera</span>
                        Fotos Pré-Procedimento
                    </h2>
                    <p className="text-sm text-[#9a4c5f] mb-6">Capture ou anexe as fotos de referência antes do início do procedimento.</p>
                    <div className="flex flex-wrap gap-4">
                        <div className="size-32 rounded-2xl border-2 border-dashed border-[#e7cfd5] dark:border-[#4d3239] flex flex-col items-center justify-center text-[#9a4c5f] hover:bg-primary/5 hover:border-primary transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                            <span className="text-[10px] font-bold mt-2 uppercase">Adicionar</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 py-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="px-8 py-3"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={proceduresList.some(p => formData.procedures.includes(p.name) && p.scripts?.length > 0) && !formData.selectedProtocolId}
                        className="px-10 py-3 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Iniciar Protocolo
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ProtocolRegistration;
