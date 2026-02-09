import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../src/services/supabaseService';
import { supabase } from '../../src/lib/supabase';
import { toast } from 'react-hot-toast';
import ContactTimeline from './ContactTimeline';
import AddContactModal from './AddContactModal';
import ComplaintClosureModal from './ComplaintClosureModal';
import { OmbudsmanComplaint, ComplaintSeverity, ComplaintStatus, ComplaintResolutionStatus } from '../../types';

interface UserProfile {
    id: string;
    full_name: string;
    role: string;
}

interface ComplaintDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    complaint: OmbudsmanComplaint | null;
    onUpdate?: () => void;
}

const ComplaintDetailsModal: React.FC<ComplaintDetailsModalProps> = ({ isOpen, onClose, complaint, onUpdate }) => {
    const [employees, setEmployees] = useState<UserProfile[]>([]);
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'contacts'>('details');
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [contactsCount, setContactsCount] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            if (complaint) {
                setAssignedTo(complaint.assigned_to || '');
                fetchContactsCount();
            }
        }
    }, [isOpen, complaint]);

    const fetchContactsCount = async () => {
        if (!complaint) return;
        try {
            // Query direta para contar contatos
            const { count, error } = await supabase
                .from('ombudsman_contacts')
                .select('*', { count: 'exact', head: true })
                .eq('complaint_id', complaint.id);

            if (error) throw error;

            console.log('Contacts count:', count); // Debug
            setContactsCount(count || 0);
        } catch (error) {
            console.error('Error fetching contacts count:', error);
            setContactsCount(0);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await supabaseService.getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleAssign = async (userId: string) => {
        if (!complaint) return;
        try {
            setIsLoading(true);
            await supabaseService.updateComplaint(complaint.id, { assigned_to: userId });
            setAssignedTo(userId);
            toast.success('Responsável atribuído com sucesso!');
            if (onUpdate) {
                await onUpdate();
            }
        } catch (error) {
            console.error('Error assigning complaint:', error);
            toast.error('Erro ao atribuir responsável.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseComplaint = async (resolutionStatus: ComplaintResolutionStatus, resolutionReason: string) => {
        if (!complaint) return;

        try {
            // Obter ID do usuário atual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            await supabaseService.closeComplaint(
                complaint.id,
                resolutionStatus,
                resolutionReason,
                user.id
            );

            toast.success('Reclamação encerrada com sucesso!');
            setIsClosureModalOpen(false);

            if (onUpdate) {
                await onUpdate();
            }

            onClose();
        } catch (error: any) {
            console.error('Error closing complaint:', error);
            throw error; // Propagar erro para o modal mostrar
        }
    };


    const handleStatusChange = async (newStatus: ComplaintStatus) => {
        if (!complaint) return;

        // Validação: não permitir mudança de "nova" para "em_analise" sem atribuição
        // Usar assignedTo (estado local) ao invés de complaint.assigned_to
        if (complaint.status === 'nova' && newStatus === 'em_analise' && !assignedTo) {
            toast.error('É necessário atribuir um responsável antes de mudar o status para "Em Análise".');
            return;
        }

        try {
            setIsLoading(true);
            await supabaseService.updateComplaint(complaint.id, { status: newStatus });
            toast.success('Status atualizado com sucesso!');
            if (onUpdate) {
                await onUpdate();
            }
            onClose();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: ComplaintStatus) => {
        const statusConfig = {
            nova: { label: 'Nova', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
            em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
            resolvida: { label: 'Resolvida', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
            baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' }
        };

        const config = statusConfig[status] || statusConfig.nova;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    if (!isOpen || !complaint) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#2d181e] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-primary/20">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-[#2d181e] border-b border-gray-200 dark:border-primary/10 p-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes da Reclamação</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {complaint.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-primary/10 px-6">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'details'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">info</span>
                                Detalhes
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('contacts')}
                            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'contacts'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">contact_phone</span>
                                Contatos
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {activeTab === 'details' ? (
                        <>
                            {/* Status e Info Básica */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold block mb-1">Status Atual</span>
                                    {getStatusBadge(complaint.status)}
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold block mb-1">Data de Abertura</span>
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {new Date(complaint.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Paciente e Responsável */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">person</span>
                                        Paciente
                                    </h3>
                                    <div className="bg-white dark:bg-[#1a0f12] p-4 rounded-lg border border-gray-200 dark:border-gray-700 h-full">
                                        <p className="font-medium text-gray-900 dark:text-white text-lg">
                                            {complaint.patient?.name || 'Paciente Não Identificado'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-gray-500">assignment_ind</span>
                                        Responsável
                                    </h3>
                                    <div className="bg-white dark:bg-[#1a0f12] p-4 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex items-center">
                                        <select
                                            value={assignedTo}
                                            onChange={(e) => handleAssign(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                            aria-label="Atribuir responsável"
                                        >
                                            <option value="">Selecione um responsável...</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.full_name} ({emp.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Classificação e Riscos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Classificação</h3>
                                    <div className="bg-white dark:bg-[#1a0f12] p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Tipo</span>
                                            <p className="font-medium text-gray-900 dark:text-white">{complaint.type}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Origem</span>
                                            <p className="font-medium text-gray-900 dark:text-white">{complaint.origin}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Riscos Identificados</h3>
                                    <div className="bg-white dark:bg-[#1a0f12] p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                        {complaint.risk_legal && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="material-symbols-outlined text-blue-600">gavel</span>
                                                Risco Jurídico
                                            </div>
                                        )}
                                        {complaint.risk_reputation && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="material-symbols-outlined text-red-600">warning</span>
                                                Risco Reputacional
                                            </div>
                                        )}
                                        {complaint.risk_financial && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="material-symbols-outlined text-yellow-600">payments</span>
                                                Risco Financeiro
                                            </div>
                                        )}
                                        {!complaint.risk_legal && !complaint.risk_reputation && !complaint.risk_financial && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum risco identificado</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Descrição */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-500">description</span>
                                    Descrição do Problema
                                </h3>
                                <div className="bg-white dark:bg-[#1a0f12] p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{complaint.description}</p>
                                </div>
                            </div>

                            {/* Status Change Actions */}
                            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-primary/10">
                                <button
                                    onClick={() => handleStatusChange('em_analise')}
                                    disabled={isLoading || complaint.status !== 'nova'}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Iniciar Tratativa
                                </button>
                            </div>
                        </>
                    ) : (
                        <ContactTimeline
                            complaintId={complaint.id}
                            onAddContact={() => setIsAddContactModalOpen(true)}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-primary/10 flex justify-between items-center">
                    {/* Botão Encerrar Reclamação */}
                    {complaint.status !== 'encerrada' && (
                        <button
                            onClick={() => setIsClosureModalOpen(true)}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">lock</span>
                            Encerrar Reclamação
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            {/* Add Contact Modal */}
            {complaint && (
                <AddContactModal
                    isOpen={isAddContactModalOpen}
                    onClose={() => setIsAddContactModalOpen(false)}
                    complaintId={complaint.id}
                    onSuccess={() => {
                        setIsAddContactModalOpen(false);
                        fetchContactsCount(); // Atualizar contagem
                        if (onUpdate) onUpdate();
                    }}
                />
            )}

            {/* Complaint Closure Modal */}
            {complaint && (
                <ComplaintClosureModal
                    isOpen={isClosureModalOpen}
                    onClose={() => setIsClosureModalOpen(false)}
                    complaintId={complaint.id}
                    hasContacts={contactsCount > 0}
                    onConfirm={handleCloseComplaint}
                />
            )}
        </div>
    );
};

export default ComplaintDetailsModal;
