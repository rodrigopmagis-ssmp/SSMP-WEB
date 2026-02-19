import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaService, Appointment } from '../../services/AgendaService';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'patient' | 'professional' | 'duration' | 'start_time' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'scheduled' | 'confirmed' | 'no_show' | 'completed' | 'cancelled';

interface FilterState {
    period: { start: Date; end: Date };
    status: StatusFilter;
    professionalId: string;
    patientName: string;
}

interface AgendaReportProps {
    isOpen: boolean;
    onClose: () => void;
    professionals: { id: string; full_name: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    scheduled: { label: 'Agendado', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    no_show: { label: 'Não compareceu', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    completed: { label: 'Concluído', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    rescheduled: { label: 'Reagendado', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
};

const PERIOD_PRESETS = [
    { label: 'Esta semana', getValue: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) }) },
    { label: 'Semana passada', getValue: () => ({ start: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }), end: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }) }) },
    { label: 'Este mês', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
    { label: 'Mês passado', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
];

function durationMinutes(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
    'bg-teal-400', 'bg-purple-400', 'bg-blue-400', 'bg-amber-400',
    'bg-pink-400', 'bg-green-400', 'bg-red-400', 'bg-indigo-400',
];

function avatarColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

const AgendaReport: React.FC<AgendaReportProps> = ({ isOpen, onClose, professionals }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>('start_time');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        period: { start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) },
        status: 'all',
        professionalId: 'all',
        patientName: '',
    });

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const data = await AgendaService.getAppointments(
                filters.period.start,
                filters.period.end,
                filters.professionalId,
            );
            setAppointments(data);
        } catch (err) {
            console.error('Report fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [filters.period, filters.professionalId]);

    useEffect(() => {
        if (isOpen) fetchReport();
    }, [isOpen, fetchReport]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ── Derived data ─────────────────────────────────────────────────────────

    // Base filtered data (date range, professional, and patient name)
    // Counters should depend on this.
    const baseFiltered = appointments.filter(a => {
        if (filters.patientName && !a.patient?.name.toLowerCase().includes(filters.patientName.toLowerCase())) return false;
        return true;
    });

    const counts = {
        scheduled: baseFiltered.filter(a => a.status === 'scheduled').length,
        confirmed: baseFiltered.filter(a => a.status === 'confirmed').length,
        no_show: baseFiltered.filter(a => a.status === 'no_show').length,
        completed: baseFiltered.filter(a => a.status === 'completed').length,
        cancelled: baseFiltered.filter(a => a.status === 'cancelled').length,
        all: baseFiltered.length,
    };

    // Table data (includes status filter)
    const filtered = baseFiltered.filter(a => {
        if (filters.status !== 'all' && a.status !== filters.status) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        let va: string | number = '';
        let vb: string | number = '';
        if (sortField === 'patient') { va = a.patient?.name || ''; vb = b.patient?.name || ''; }
        if (sortField === 'professional') { va = a.professional?.full_name || ''; vb = b.professional?.full_name || ''; }
        if (sortField === 'duration') { va = durationMinutes(a.start_time, a.end_time); vb = durationMinutes(b.start_time, b.end_time); }
        if (sortField === 'start_time') { va = a.start_time; vb = b.start_time; }
        if (sortField === 'status') { va = a.status; vb = b.status; }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const toggleRow = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === sorted.length) setSelected(new Set());
        else setSelected(new Set(sorted.map(a => a.id)));
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="material-symbols-outlined text-xs ml-0.5 opacity-60" style={{ fontSize: '14px' }}>
            {sortField === field ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
    );

    const periodLabel = `${format(filters.period.start, 'dd/MM/yyyy')} - ${format(filters.period.end, 'dd/MM/yyyy')}`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Relatório de agendamentos</h2>
                        <span className="text-sm text-gray-400 font-normal">{filtered.length} registros</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-wrap">
                    {/* Period picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPeriodDropdown(v => !v)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-500" style={{ fontSize: '16px' }}>calendar_today</span>
                            <span className="font-medium text-gray-700">Período:</span>
                            <span className="text-gray-600">{periodLabel}</span>
                            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>expand_more</span>
                        </button>
                        {showPeriodDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px] py-1">
                                {PERIOD_PRESETS.map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => {
                                            setFilters(f => ({ ...f, period: p.getValue() }));
                                            setShowPeriodDropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                                <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-2">
                                    <p className="text-xs text-gray-400 mb-1.5">Personalizado</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={format(filters.period.start, 'yyyy-MM-dd')}
                                            onChange={e => setFilters(f => ({ ...f, period: { ...f.period, start: new Date(e.target.value + 'T00:00:00') } }))}
                                            className="text-xs border border-gray-200 rounded px-2 py-1 w-full"
                                        />
                                        <input
                                            type="date"
                                            value={format(filters.period.end, 'yyyy-MM-dd')}
                                            onChange={e => setFilters(f => ({ ...f, period: { ...f.period, end: new Date(e.target.value + 'T23:59:59') } }))}
                                            className="text-xs border border-gray-200 rounded px-2 py-1 w-full"
                                        />
                                    </div>
                                    <button
                                        onClick={() => { fetchReport(); setShowPeriodDropdown(false); }}
                                        className="mt-2 w-full text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 transition-colors"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add filter */}
                    <button
                        onClick={() => setShowFilterPanel(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${showFilterPanel ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-blue-600 hover:bg-blue-50'}`}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                        Adicionar filtro
                    </button>

                    <div className="ml-auto">
                        <button
                            onClick={() => setFilters({
                                period: { start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) },
                                status: 'all',
                                professionalId: 'all',
                                patientName: '',
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                            Atualizar
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilterPanel && (
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>calendar_today</span>
                                <span className="text-sm text-gray-600 font-medium">Período</span>
                                <span className="text-xs text-gray-400">(use o seletor acima)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>radio_button_checked</span>
                                <span className="text-sm text-gray-600 font-medium">Status</span>
                                <select
                                    value={filters.status}
                                    onChange={e => setFilters(f => ({ ...f, status: e.target.value as StatusFilter }))}
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                    <option value="all">Todos</option>
                                    <option value="scheduled">Agendado</option>
                                    <option value="confirmed">Confirmado</option>
                                    <option value="no_show">Não compareceu</option>
                                    <option value="completed">Concluído</option>
                                    <option value="cancelled">Cancelado</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>person</span>
                                <span className="text-sm text-gray-600 font-medium">Profissionais</span>
                                <select
                                    value={filters.professionalId}
                                    onChange={e => setFilters(f => ({ ...f, professionalId: e.target.value }))}
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                    <option value="all">Todos</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>person_search</span>
                                <span className="text-sm text-gray-600 font-medium">Pacientes</span>
                                <input
                                    type="text"
                                    placeholder="Buscar paciente..."
                                    value={filters.patientName}
                                    onChange={e => setFilters(f => ({ ...f, patientName: e.target.value }))}
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"
                                />
                            </div>
                            <button
                                onClick={() => setFilters(f => ({ ...f, status: 'all', professionalId: 'all', patientName: '' }))}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    </div>
                )}

                {/* Status Cards */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-wrap">
                    {([
                        { key: 'scheduled', label: 'Agendado', icon: 'calendar_today', bg: 'bg-white border-transparent', iconColor: 'text-gray-400', ring: 'ring-gray-200' },
                        { key: 'confirmed', label: 'Confirmado', icon: 'check_circle', bg: 'bg-blue-50', iconColor: 'text-blue-500', ring: 'ring-blue-200' },
                        { key: 'no_show', label: 'Não compareceu', icon: 'warning', bg: 'bg-orange-50', iconColor: 'text-orange-400', ring: 'ring-orange-200' },
                        { key: 'completed', label: 'Concluído', icon: 'bar_chart', bg: 'bg-indigo-50', iconColor: 'text-indigo-500', ring: 'ring-indigo-200' },
                        { key: 'cancelled', label: 'Cancelado', icon: 'cancel', bg: 'bg-red-50', iconColor: 'text-red-400', ring: 'ring-red-200' },
                        { key: 'all', label: 'Total', icon: 'check_circle', bg: 'bg-green-50', iconColor: 'text-green-500', ring: 'ring-green-200', border: 'border-green-200' },
                    ] as const).map(tab => {
                        const isActive = filters.status === tab.key;
                        const isWhite = tab.bg.includes('bg-white');
                        const isTotal = tab.key === 'all';

                        return (
                            <button
                                key={tab.key}
                                onClick={() => setFilters(f => ({ ...f, status: tab.key }))}
                                className={`flex items-center gap-4 px-5 py-3 rounded-2xl min-w-[150px] transition-all border ${isTotal ? 'border-green-200 bg-green-50/50' : 'border-transparent'} ${isActive ? `ring-2 ${tab.ring} bg-opacity-100` : 'ring-0 opacity-70 hover:opacity-100'} ${isWhite ? 'hover:bg-gray-50' : tab.bg} flex-1`}
                            >
                                <span className={`material-symbols-outlined text-3xl ${tab.iconColor} ${isActive ? 'opacity-100' : 'opacity-80'}`}>{tab.icon}</span>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter leading-none mb-1">{tab.label}</span>
                                    <span className="text-3xl font-extrabold text-gray-900 leading-none">{counts[tab.key]}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>


                {/* Table */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                            <p className="text-sm">Nenhum agendamento encontrado</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white border-b border-gray-100">
                                <tr>
                                    <th className="w-10 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selected.size === sorted.length && sorted.length > 0}
                                            onChange={toggleAll}
                                            className="rounded border-gray-300 text-blue-600"
                                        />
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium text-gray-600">Procedimentos</th>
                                    <th className="px-3 py-3 text-left">
                                        <button onClick={() => toggleSort('patient')} className="flex items-center font-medium text-gray-600 hover:text-gray-900">
                                            Paciente <SortIcon field="patient" />
                                        </button>
                                    </th>
                                    <th className="px-3 py-3 text-left">
                                        <button onClick={() => toggleSort('professional')} className="flex items-center font-medium text-gray-600 hover:text-gray-900">
                                            Profissional <SortIcon field="professional" />
                                        </button>
                                    </th>
                                    <th className="px-3 py-3 text-left">
                                        <button onClick={() => toggleSort('duration')} className="flex items-center font-medium text-gray-600 hover:text-gray-900">
                                            Duração <SortIcon field="duration" />
                                        </button>
                                    </th>
                                    <th className="px-3 py-3 text-left">
                                        <button onClick={() => toggleSort('start_time')} className="flex items-center font-medium text-gray-600 hover:text-gray-900">
                                            Agendado para <SortIcon field="start_time" />
                                        </button>
                                    </th>
                                    <th className="px-3 py-3 text-left">
                                        <button onClick={() => toggleSort('status')} className="flex items-center font-medium text-gray-600 hover:text-gray-900">
                                            Status <SortIcon field="status" />
                                        </button>
                                    </th>
                                    <th className="w-10 px-3 py-3">
                                        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>settings</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sorted.map(appt => {
                                    const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                                    const dur = durationMinutes(appt.start_time, appt.end_time);
                                    const patientName = appt.patient?.name || 'Paciente';
                                    const proName = appt.professional?.full_name || '—';
                                    const startDt = new Date(appt.start_time);
                                    return (
                                        <tr key={appt.id} className={`hover:bg-gray-50 transition-colors ${selected.has(appt.id) ? 'bg-blue-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(appt.id)}
                                                    onChange={() => toggleRow(appt.id)}
                                                    className="rounded border-gray-300 text-blue-600"
                                                />
                                            </td>
                                            <td className="px-3 py-3 text-gray-800 font-medium max-w-[160px] truncate">
                                                {appt.type || appt.title || '—'}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full ${avatarColor(patientName)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                                        {initials(patientName)}
                                                    </div>
                                                    <span className="text-gray-700 truncate max-w-[110px]">{patientName}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full ${avatarColor(proName)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                                        {initials(proName)}
                                                    </div>
                                                    <span className="text-gray-700 truncate max-w-[110px]">{proName}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-gray-600">{dur} min</td>
                                            <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                                                {format(startDt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_vert</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                {selected.size > 0 && (
                    <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-3">
                        <span className="text-sm text-blue-700 font-medium">{selected.size} selecionado(s)</span>
                        <button className="text-xs text-red-600 hover:underline">Cancelar selecionados</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgendaReport;
