
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../src/services/supabaseService';
import { OmbudsmanComplaint, ComplaintStatus, ComplaintSeverity, Patient } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ComplaintCreationModal from './ComplaintCreationModal';
import ComplaintDetailsModal from './ComplaintDetailsModal';

interface OmbudsmanDashboardProps {
    patients?: Patient[];
}

const OmbudsmanDashboard: React.FC<OmbudsmanDashboardProps> = ({ patients = [] }) => {
    const [complaints, setComplaints] = useState<OmbudsmanComplaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<OmbudsmanComplaint | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await supabaseService.getComplaints();
            setComplaints(data);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplaintSuccess = (newComplaint: OmbudsmanComplaint) => {
        setComplaints([newComplaint, ...complaints]);
    };

    const handleViewDetails = (complaint: OmbudsmanComplaint) => {
        setSelectedComplaint(complaint);
        setIsDetailsModalOpen(true);
    };

    const handleComplaintUpdate = async () => {
        await fetchComplaints();
    };

    const handleCardClick = (filter: string) => {
        setActiveFilter(filter);
    };

    const getStats = () => {
        const total = complaints.length;
        const open = complaints.filter(c => c.status === 'nova' || c.status === 'em_analise').length;
        const critical = complaints.filter(c => c.severity === 'critica' || c.severity === 'alta').length;
        const resolved = complaints.filter(c => c.status === 'resolvida' || c.status === 'encerrada').length;
        return { total, open, critical, resolved };
    };

    const getSLAStatus = (complaint: OmbudsmanComplaint) => {
        if (!complaint.sla_deadline || complaint.status !== 'nova') return null;

        const now = new Date();
        const deadline = new Date(complaint.sla_deadline);
        const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursRemaining < 0) {
            return { status: 'overdue', label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-300' };
        } else if (hoursRemaining < 4) {
            return { status: 'at_risk', label: 'Urgente', color: 'bg-orange-100 text-orange-800 border-orange-300' };
        } else {
            return { status: 'on_time', label: 'No prazo', color: 'bg-green-100 text-green-800 border-green-300' };
        }
    };

    const getSeverityBadge = (severity: ComplaintSeverity) => {
        const styles = {
            baixa: 'bg-green-100 text-green-800 border-green-200',
            media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            alta: 'bg-orange-100 text-orange-800 border-orange-200',
            critica: 'bg-red-100 text-red-800 border-red-200',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${styles[severity] || styles.baixa}`}>
                {severity}
            </span>
        );
    };

    const getStatusBadge = (status: ComplaintStatus) => {
        const styles: Record<string, string> = {
            nova: 'bg-blue-100 text-blue-800 border-blue-200',
            em_analise: 'bg-purple-100 text-purple-800 border-purple-200',
            aguardando_acao: 'bg-orange-100 text-orange-800 border-orange-200',
            resolvida: 'bg-green-100 text-green-800 border-green-200',
            encerrada: 'bg-gray-100 text-gray-800 border-gray-200',
            escalada: 'bg-red-100 text-red-800 border-red-200',
        };

        const labels: Record<string, string> = {
            nova: 'Nova',
            em_analise: 'Em Análise',
            aguardando_acao: 'Aguardando Ação',
            resolvida: 'Resolvida',
            encerrada: 'Encerrada',
            escalada: 'Escalada',
            em_negociacao: 'Em Negociação'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {labels[status] || status.replace('_', ' ')}
            </span>
        );
    };

    const filteredComplaints = complaints.filter(c => {
        const matchesSearch =
            c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;

        // Apply card filter
        let matchesCardFilter = true;
        if (activeFilter === 'open') {
            matchesCardFilter = c.status === 'nova' || c.status === 'em_analise';
        } else if (activeFilter === 'critical') {
            matchesCardFilter = c.severity === 'critica' || c.severity === 'alta';
        } else if (activeFilter === 'resolved') {
            matchesCardFilter = c.status === 'resolvida' || c.status === 'encerrada';
        }

        return matchesSearch && matchesStatus && matchesCardFilter;
    });

    // KPI Calculations
    const stats = {
        total: complaints.length,
        open: complaints.filter(c => ['nova', 'em_analise', 'aguardando_acao', 'em_negociacao'].includes(c.status)).length,
        highRisk: complaints.filter(c => c.severity === 'alta' || c.severity === 'critica').length,
        resolvedMonth: complaints.filter(c => c.status === 'resolvida').length // Simplified, ideally filter by date
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#2d181e] p-6 rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Ouvidoria</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestão de reclamações e feedback de pacientes.</p>
                </div>
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    <span className="material-symbols-outlined mr-2">add_alert</span>
                    Nova Reclamação
                </Button>
            </div>

            {/* KPI Cards - Clickable with Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                    onClick={() => handleCardClick('all')}
                    className={`bg-white dark:bg-[#2d181e] rounded-xl p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeFilter === 'all' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-primary/10'
                        }`}
                >
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total de Reclamações</p>
                    <h3 className="text-3xl font-black text-gray-800 dark:text-white">{getStats().total}</h3>
                </div>
                <div
                    onClick={() => handleCardClick('open')}
                    className={`bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeFilter === 'open' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-100 dark:border-blue-800/30'
                        }`}
                >
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Em Aberto</p>
                    <h3 className="text-3xl font-black text-blue-800 dark:text-blue-200">{getStats().open}</h3>
                </div>
                <div
                    onClick={() => handleCardClick('critical')}
                    className={`bg-red-50 dark:bg-red-900/10 rounded-xl p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeFilter === 'critical' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-red-100 dark:border-red-800/30'
                        }`}
                >
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Alto Risco / Críticas</p>
                    <h3 className="text-3xl font-black text-red-800 dark:text-red-200">{getStats().critical}</h3>
                </div>
                <div
                    onClick={() => handleCardClick('resolved')}
                    className={`bg-green-50 dark:bg-green-900/10 rounded-xl p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeFilter === 'resolved' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-green-100 dark:border-green-800/30'
                        }`}
                >
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Resolvidas (Total)</p>
                    <h3 className="text-3xl font-black text-green-800 dark:text-green-200">{getStats().resolved}</h3>
                </div>
            </div>

            {/* Filters & Table */}
            <section className="bg-white dark:bg-[#2d181e] rounded-xl shadow-sm border border-gray-200 dark:border-primary/10 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-primary/10 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-black/20">
                    <div className="relative w-full md:max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por descrição, paciente ou ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a0f12] focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a0f12] text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="Todos">Todos</option>
                            <option value="nova">Nova</option>
                            <option value="em_analise">Em Análise</option>
                            <option value="aguardando_acao">Aguardando Ação</option>
                            <option value="resolvida">Resolvida</option>
                            <option value="encerrada">Encerrada</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fff5f7] dark:bg-[#351a21] text-[#9a4c5f] dark:text-[#c4a1a9] text-xs font-bold uppercase tracking-widest">
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Data</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Paciente</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Tipo / Origem</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Descrição</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Severidade</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Status</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-primary/10">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <span className="material-symbols-outlined animate-spin">refresh</span>
                                            Carregando...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredComplaints.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        Nenhuma reclamação encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredComplaints.map((complaint) => (
                                    <tr key={complaint.id} className="hover:bg-gray-50 dark:hover:bg-primary/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {new Date(complaint.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {complaint.patient?.name || 'Paciente Desconhecido'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">{complaint.type}</div>
                                            <div className="text-xs text-gray-500">{complaint.origin}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={complaint.description}>
                                            {complaint.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getSeverityBadge(complaint.severity)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(complaint.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="text-gray-400 hover:text-[#E44E58] transition-colors"
                                                title="Ver Detalhes"
                                                onClick={() => handleViewDetails(complaint)}
                                            >
                                                <span className="material-symbols-outlined">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <ComplaintCreationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                patientId="" // Empty implies we need selection in modal
                patients={patients} // Pass all patients for selection
                onSuccess={handleComplaintSuccess}
            />

            <ComplaintDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                complaint={selectedComplaint}
                onUpdate={handleComplaintUpdate}
            />
        </div>
    );
};

export default OmbudsmanDashboard;
