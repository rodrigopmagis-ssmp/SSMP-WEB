import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../src/services/supabaseService';
import { ComplaintSeverity, ComplaintStatus, Patient } from '../../types';

interface ComplaintCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    isPatientFixed?: boolean;
    patients?: Patient[];
    onSuccess: (complaint: any) => void;
}

const ComplaintCreationModal: React.FC<ComplaintCreationModalProps> = ({
    isOpen,
    onClose,
    patientId,
    isPatientFixed = false,
    patients = [],
    onSuccess
}) => {
    if (!isOpen) return null;

    const [description, setDescription] = useState('');
    const [type, setType] = useState('Administrativo');
    const [origin, setOrigin] = useState('WhatsApp');
    const [severity, setSeverity] = useState<ComplaintSeverity>('baixa');
    const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');

    // Risks (booleans as per types.ts)
    const [riskLegal, setRiskLegal] = useState(false);
    const [riskReputational, setRiskReputational] = useState(false);
    const [riskFinancial, setRiskFinancial] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Patient search states
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedPatientName, setSelectedPatientName] = useState('');
    const [isPatientConfirmed, setIsPatientConfirmed] = useState(false);

    useEffect(() => {
        if (patientId) {
            setSelectedPatientId(patientId);
            const patient = patients.find(p => p.id === patientId);
            if (patient) {
                setSelectedPatientName(patient.name);
                setIsPatientConfirmed(true);
            }
        } else {
            // If patientId is removed/empty, reset
            setSelectedPatientId('');
            setSelectedPatientName('');
            setIsPatientConfirmed(false);
            setSearchTerm('');
        }
    }, [patientId, patients]);

    // Filter patients based on search term
    useEffect(() => {
        if (searchTerm.length > 0) {
            const filtered = patients
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .slice(0, 10);
            setFilteredPatients(filtered);
            setShowDropdown(true);
        } else {
            setFilteredPatients([]);
            setShowDropdown(false);
        }
    }, [searchTerm, patients]);

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatientId(patient.id);
        setSelectedPatientName(patient.name);
        setSearchTerm(patient.name);
        setShowDropdown(false);
        setIsPatientConfirmed(false); // Reset confirmation when changing patient
    };

    const handleConfirmPatient = () => {
        if (selectedPatientId && selectedPatientName) {
            setIsPatientConfirmed(true);
            setError(''); // Clear any errors
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validação: Paciente obrigatório e confirmado
        if (!selectedPatientId || !isPatientConfirmed) {
            setError('Por favor, selecione e confirme um paciente.');
            setLoading(false);
            return;
        }

        // Validação: Descrição obrigatória
        if (!description.trim()) {
            setError('Por favor, preencha a descrição do problema.');
            setLoading(false);
            return;
        }

        // Validação: Tipo obrigatório
        if (!type) {
            setError('Por favor, selecione o tipo de reclamação.');
            setLoading(false);
            return;
        }

        // Validação: Origem obrigatória
        if (!origin) {
            setError('Por favor, selecione a origem da reclamação.');
            setLoading(false);
            return;
        }

        try {
            console.log('🔍 DEBUG - Creating complaint with patient_id:', selectedPatientId);
            console.log('🔍 DEBUG - Patient confirmed:', isPatientConfirmed);
            console.log('🔍 DEBUG - Patient name:', selectedPatientName);

            const data = await supabaseService.createComplaint({
                patient_id: selectedPatientId,
                description,
                type,
                origin,
                severity,
                risk_legal: riskLegal,
                risk_reputation: riskReputational,
                risk_financial: riskFinancial,
                status: 'nova' as ComplaintStatus,
            });

            console.log('✅ DEBUG - Complaint created:', data);

            // AUTO-TAGGING LOGIC:
            // When a complaint is created, automatically add the "Reclamação" tag to the patient
            try {
                const availableTags = await supabaseService.getTags();
                const complaintTag = availableTags?.find((t: any) => t.name.toLowerCase().includes('reclamação'));

                if (complaintTag) {
                    await supabaseService.assignTag(selectedPatientId, complaintTag.id, { complaint_id: data.id });
                    console.log('✅ DEBUG - Auto-tagged patient with complaint tag');
                }
            } catch (tagErr) {
                console.error('Error auto-tagging patient:', tagErr);
                // We don't block the complaint success if tagging fails
            }

            onSuccess(data);
            onClose();
            // Reset form
            setDescription('');
            setRiskLegal(false);
            setRiskReputational(false);
            setRiskFinancial(false);
            if (!patientId) setSelectedPatientId('');
        } catch (err: any) {
            console.error('Error creating complaint:', err);
            setError(err.message || 'Erro ao criar reclamação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#2d181e] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-primary/20">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-primary/10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nova Reclamação</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registre uma nova ocorrência na ouvidoria</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm border border-red-100 dark:border-red-800/30 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    {/* Patient Selection if ID not provided or if we want to show it but potentially lock it */}
                    {(!patientId || isPatientFixed) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente *</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsPatientConfirmed(false); // Reset confirmation when typing
                                        }}
                                        onFocus={() => searchTerm && setShowDropdown(true)}
                                        placeholder="Digite o nome do paciente..."
                                        className={`w-full p-2.5 rounded-lg border ${isPatientConfirmed
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12]'
                                            } text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                                        required
                                        disabled={isPatientConfirmed}
                                    />
                                    {isPatientConfirmed && (
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400">
                                            check_circle
                                        </span>
                                    )}
                                    {showDropdown && filteredPatients.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a0f12] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredPatients.map(patient => (
                                                <div
                                                    key={patient.id}
                                                    onClick={() => handleSelectPatient(patient)}
                                                    className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-900 dark:text-white">{patient.name}</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">{patient.phone}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchTerm && filteredPatients.length === 0 && showDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a0f12] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum paciente encontrado</p>
                                        </div>
                                    )}
                                </div>
                                {selectedPatientId && !isPatientConfirmed && (
                                    <button
                                        type="button"
                                        onClick={handleConfirmPatient}
                                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-lg">check</span>
                                        Confirmar
                                    </button>
                                )}
                                {isPatientConfirmed && !isPatientFixed && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPatientConfirmed(false);
                                            setSearchTerm('');
                                            setSelectedPatientId('');
                                            setSelectedPatientName('');
                                        }}
                                        className="px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                        Alterar
                                    </button>
                                )}
                            </div>
                            {isPatientConfirmed && selectedPatientName && (
                                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                    Paciente confirmado: <strong>{selectedPatientName}</strong>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição do Problema *</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg h-32 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                            placeholder="Descreva detalhadamente a reclamação..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Reclamação</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                >
                                    <option value="Administrativo">Administrativo</option>
                                    <option value="Clínico">Clínico / Procedimento</option>
                                    <option value="Financeiro">Financeiro</option>
                                    <option value="Atendimento">Atendimento</option>
                                    <option value="Infraestrutura">Infraestrutura</option>
                                    <option value="Outro">Outro</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-sm">expand_more</span>
                            </div>
                        </div>

                        {/* Origin */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origem</label>
                            <div className="relative">
                                <select
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                >
                                    <option value="WhatsApp">WhatsApp</option>
                                    <option value="Telefone">Telefone</option>
                                    <option value="Presencial">Presencial</option>
                                    <option value="E-mail">E-mail</option>
                                    <option value="Instagram">Instagram/Redes</option>
                                    <option value="Google">Google Reviews</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-sm">expand_more</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Severity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severidade / Urgência</label>
                            <div className="relative">
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value as ComplaintSeverity)}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                >
                                    <option value="baixa">🟢 Baixa</option>
                                    <option value="media">🟡 Média</option>
                                    <option value="alta">🟠 Alta</option>
                                    <option value="critica">🔴 Crítica</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-sm">expand_more</span>
                            </div>
                        </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">warning</span>
                            Avaliação de Risco
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={riskLegal}
                                        onChange={(e) => setRiskLegal(e.target.checked)}
                                        className="peer h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/25 cursor-pointer transition-all"
                                    />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Risco Jurídico</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={riskReputational}
                                        onChange={(e) => setRiskReputational(e.target.checked)}
                                        className="peer h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/25 cursor-pointer transition-all"
                                    />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Risco Reputacional</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={riskFinancial}
                                        onChange={(e) => setRiskFinancial(e.target.checked)}
                                        className="peer h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/25 cursor-pointer transition-all"
                                    />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Risco Financeiro</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-primary/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">check</span>
                                    Registrar Reclamação
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComplaintCreationModal;
