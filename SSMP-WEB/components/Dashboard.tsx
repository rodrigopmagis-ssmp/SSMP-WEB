
import React, { useState } from 'react';
import { Patient, PatientStatus, Procedure, PatientTreatment } from '../types';
import { calculateDueDate, getSLAStatus } from '../src/utils/sla';

interface DashboardProps {
  patients: Patient[];
  procedures: Procedure[];
  treatments?: PatientTreatment[];
  onPatientSelect: (id: string, treatmentId?: string) => void;
  onNewRegistration: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ patients, procedures, treatments = [], onPatientSelect, onNewRegistration }) => {
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [protocolStatusFilter, setProtocolStatusFilter] = useState<string>('active');
  const [procedureFilter, setProcedureFilter] = useState<string>('Todos');
  const [timeFilter, setTimeFilter] = useState<string>('Todos');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // appliedFilters stores the values actually used for filtering (updated only on search button click)
  const [appliedFilters, setAppliedFilters] = useState({
    status: 'Todos',
    protocolStatus: 'active',
    procedure: 'Todos',
    time: 'Todos',
    startDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })(),
    endDate: new Date().toISOString().split('T')[0]
  });

  const clearFilters = () => {
    setStatusFilter('Todos');
    setProtocolStatusFilter('active');
    setProcedureFilter('Todos');
    setTimeFilter('Todos');
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const sDate = d.toISOString().split('T')[0];
    const eDate = new Date().toISOString().split('T')[0];
    setStartDate(sDate);
    setEndDate(eDate);
    
    // Reset applied filters as well
    setAppliedFilters({
      status: 'Todos',
      protocolStatus: 'active',
      procedure: 'Todos',
      time: 'Todos',
      startDate: sDate,
      endDate: eDate
    });
    setHasLoadedOnce(false);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      status: statusFilter,
      protocolStatus: protocolStatusFilter,
      procedure: procedureFilter,
      time: timeFilter,
      startDate: startDate,
      endDate: endDate
    });
    setHasLoadedOnce(true);
  };

  // Map treatments to display rows (joining with patient data)
  // Map treatments to display rows (joining with patient data)
  const treatmentRows = treatments.map(treatment => {
    const patient = patients.find(p => p.id === treatment.patientId);
    if (!patient) return null;

    // Determine status dynamically based on current stage SLA
    let dynamicStatus = PatientStatus.ON_TIME;

    const relevantProcedure = procedures.find(p => p.id === treatment.procedureId);
    const scripts = treatment.scripts || relevantProcedure?.scripts || [];
    const currentStageIndex = treatment.tasksCompleted;
    const currentScript = scripts[currentStageIndex];

    // Use patient.procedureDate as primary source of truth to match PatientDetails view
    // Fallback to treatment.startedAt if needed
    const referenceDate = patient.procedureDate || treatment.startedAt;

    if (currentScript?.timing && referenceDate) {
      try {
        const dueDate = calculateDueDate(referenceDate, currentScript.timing);
        const sla = getSLAStatus(dueDate);

        // Check if due date is today for "DUE_TODAY" status specific logic
        const now = new Date();
        const isToday = dueDate.getDate() === now.getDate() &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === now.getFullYear();

        if (sla === 'late') {
          dynamicStatus = PatientStatus.LATE;
        } else if (sla === 'warning' || (isToday && sla === 'ontime')) {
          dynamicStatus = PatientStatus.DUE_TODAY;
        }
      } catch (e) {
        console.error("Error calculating SLA for dashboard", e);
      }
    }

    return {
      treatment,
      patient,
      dynamicStatus,
      dueDate: currentScript?.timing && referenceDate ? calculateDueDate(referenceDate, currentScript.timing) : null
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  // Aplicar filtros combinados - Uses appliedFilters to avoid real-time filtering
  const filteredRows = treatmentRows.filter(row => {
    // 0. Only show if loaded once
    if (!hasLoadedOnce) return false;

    // 1. Protocol Status Filter
    if (appliedFilters.protocolStatus !== 'all' && row.treatment.status !== appliedFilters.protocolStatus) return false;

    // 2. SLA Status Filter
    if (appliedFilters.status !== 'Todos' && row.dynamicStatus !== appliedFilters.status) return false;

    // 3. Procedure Filter
    if (appliedFilters.procedure !== 'Todos' && row.treatment.procedureName !== appliedFilters.procedure) return false;

    // 3. Date Range Filter
    const startAtDate = row.treatment.startedAt.split('T')[0];
    if (startAtDate < appliedFilters.startDate || startAtDate > appliedFilters.endDate) return false;

    // 4. Time Filter (SLA specific)
    if (appliedFilters.time !== 'Todos') {
      if (!row.dueDate) return false;

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const diffMs = row.dueDate.getTime() - now.getTime();
      const isSameDay = row.dueDate.getDate() === now.getDate() &&
        row.dueDate.getMonth() === now.getMonth() &&
        row.dueDate.getFullYear() === now.getFullYear();

      // Filter by period relative to NOW
      switch (appliedFilters.time) {
        case '1h': return diffMs > 0 && diffMs <= 3600000;
        case '4h': return diffMs > 0 && diffMs <= 14400000;
        case '12h': return diffMs > 0 && diffMs <= 43200000;
        case 'Hoje': return isSameDay;
        case 'Amanha': {
          const tomorrow = new Date(todayStart);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return row.dueDate.getDate() === tomorrow.getDate() &&
            row.dueDate.getMonth() === tomorrow.getMonth() &&
            row.dueDate.getFullYear() === tomorrow.getFullYear();
        }
        case 'Semana': {
          const endOfWeek = new Date(todayStart);
          endOfWeek.setDate(endOfWeek.getDate() + 7);
          return row.dueDate >= todayStart && row.dueDate <= endOfWeek;
        }
        case 'Mes': {
          const endOfMonth = new Date(todayStart);
          endOfMonth.setMonth(endOfMonth.getMonth() + 1);
          return row.dueDate >= todayStart && row.dueDate <= endOfMonth;
        }
        default: return true;
      }
    }

    return true;
  });

  const protocolStatusLabel = appliedFilters.protocolStatus === 'active' ? 'Ativos' :
    appliedFilters.protocolStatus === 'completed' ? 'Concluídos' :
      appliedFilters.protocolStatus === 'cancelled' ? 'Cancelados' : 'Filtrados';

  // Calcular estatísticas baseadas nos filtros
  const stats = {
    totalPatients: new Set(filteredRows.map(r => r.treatment.patientId)).size,
    totalOpenProtocols: filteredRows.length,
    totalRemainingActions: filteredRows.reduce((acc, row) => acc + (row.treatment.totalTasks - row.treatment.tasksCompleted), 0),
    dueToday: filteredRows.filter(r => r.dynamicStatus === PatientStatus.DUE_TODAY).length,
    overdue: filteredRows.filter(r => r.dynamicStatus === PatientStatus.LATE).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Functional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#2d181e] p-6 rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Painel de Controle</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral da operação e protocolos ativos.</p>
        </div>

      </div>

      {/* Stats Overview - Dense & Readable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div
          onClick={() => {
            const defaults = { ...appliedFilters, status: 'Todos', time: 'Todos', procedure: 'Todos' };
            setAppliedFilters(defaults);
            setStatusFilter('Todos');
            setTimeFilter('Todos');
            setProcedureFilter('Todos');
            setHasLoadedOnce(true);
          }}
          className="bg-pink-50/40 dark:bg-pink-900/10 rounded-2xl p-4 md:p-6 shadow-sm border border-pink-100/50 dark:border-pink-800/30 flex items-center justify-between hover:shadow-md transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-pink-100 dark:hover:ring-pink-900 active:scale-[0.98]"
        >
          <div>
            <p className="text-[10px] md:text-xs font-bold text-pink-900/60 dark:text-pink-400 uppercase tracking-wider mb-1">Protocolos {protocolStatusLabel}</p>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">{stats.totalOpenProtocols}</h3>
          </div>
          <div className="size-10 md:size-12 rounded-xl bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 dark:text-pink-400 shadow-inner">
            <span className="material-symbols-outlined text-xl md:text-2xl">medical_services</span>
          </div>
        </div>

        <div
          onClick={() => {
            const defaults = { ...appliedFilters, status: 'Todos', time: 'Todos', procedure: 'Todos' };
            setAppliedFilters(defaults);
            setStatusFilter('Todos');
            setTimeFilter('Todos');
            setProcedureFilter('Todos');
            setHasLoadedOnce(true);
          }}
          className="bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl p-4 md:p-6 shadow-sm border border-blue-100/50 dark:border-blue-800/30 flex items-center justify-between hover:shadow-md transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-blue-100 dark:hover:ring-blue-900 active:scale-[0.98]"
        >
          <div>
            <p className="text-[10px] md:text-xs font-bold text-blue-900/60 dark:text-blue-400 uppercase tracking-wider mb-1">Ações Pendentes</p>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">{stats.totalRemainingActions}</h3>
          </div>
          <div className="size-10 md:size-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <span className="material-symbols-outlined text-xl md:text-2xl">assignment</span>
          </div>
        </div>

        <div
          onClick={() => {
            const newFilters = { ...appliedFilters, status: PatientStatus.DUE_TODAY, time: 'Todos' };
            setAppliedFilters(newFilters);
            setStatusFilter(PatientStatus.DUE_TODAY);
            setTimeFilter('Todos');
            setHasLoadedOnce(true);
          }}
          className="bg-orange-50/40 dark:bg-orange-900/10 rounded-2xl p-4 md:p-6 shadow-sm border border-orange-100/50 dark:border-orange-800/30 flex items-center justify-between hover:shadow-md transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-orange-100 dark:hover:ring-orange-900 active:scale-[0.98]"
        >
          <div>
            <p className="text-[10px] md:text-xs font-bold text-orange-900/60 dark:text-orange-400 uppercase tracking-wider mb-1">Atenção Hoje</p>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">{stats.dueToday}</h3>
          </div>
          <div className="size-10 md:size-12 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
            <span className="material-symbols-outlined text-xl md:text-2xl">notifications_active</span>
          </div>
        </div>

        <div
          onClick={() => {
            const newFilters = { ...appliedFilters, status: PatientStatus.LATE, time: 'Todos' };
            setAppliedFilters(newFilters);
            setStatusFilter(PatientStatus.LATE);
            setTimeFilter('Todos');
            setHasLoadedOnce(true);
          }}
          className="bg-red-50/40 dark:bg-red-900/10 rounded-2xl p-4 md:p-6 shadow-sm border border-red-100/50 dark:border-red-800/30 flex items-center justify-between hover:shadow-md transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-red-100 dark:hover:ring-red-900 active:scale-[0.98]"
        >
          <div>
            <p className="text-[10px] md:text-xs font-bold text-red-900/60 dark:text-red-400 uppercase tracking-wider mb-1">Atrasados</p>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">{stats.overdue}</h3>
          </div>
          <div className="size-10 md:size-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
            <span className="material-symbols-outlined text-xl md:text-2xl">warning</span>
          </div>
        </div>
      </div>

      {/* Active Protocols Table - High Density & Contrast */}
      <section className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm overflow-hidden flex-1">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-primary/10 flex items-center justify-between bg-gray-50 dark:bg-black/20">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500">list_alt</span>
            Protocolos Ativos
          </h3>

          <div className="flex flex-wrap items-end gap-3 justify-end">
            {/* Data Inicial */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 px-2 focus:ring-primary focus:border-primary h-[34px]"
              />
            </div>

            {/* Data Final */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 px-2 focus:ring-primary focus:border-primary h-[34px]"
              />
            </div>

            {/* Procedure Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Procedimento</label>
              <select
                value={procedureFilter}
                onChange={(e) => setProcedureFilter(e.target.value)}
                className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 pl-2 pr-8 focus:ring-primary focus:border-primary max-w-[150px] h-[34px]"
                aria-label="Filtrar por Procedimento"
              >
                <option value="Todos">Todos</option>
                {procedures.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Vencimento</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 pl-2 pr-8 focus:ring-primary focus:border-primary h-[34px]"
                aria-label="Filtrar por Vencimento"
              >
                <option value="Todos">Todos</option>
                <option value="1h">Próxima 1h</option>
                <option value="4h">Próximas 4h</option>
                <option value="12h">Próximas 12h</option>
                <option value="Hoje">Hoje</option>
                <option value="Amanha">Amanhã</option>
                <option value="Semana">Esta Semana</option>
                <option value="Mes">Este Mês</option>
              </select>
            </div>

            {/* Protocol Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Status Protocolo</label>
              <select
                value={protocolStatusFilter}
                onChange={(e) => setProtocolStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 pl-2 pr-8 focus:ring-primary focus:border-primary h-[34px]"
                aria-label="Filtrar por Status do Protocolo"
              >
                <option value="active">Ativos</option>
                <option value="completed">Concluídos</option>
                <option value="cancelled">Cancelados</option>
                <option value="all">Todos</option>
              </select>
            </div>

            {/* SLA Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">SLA (Atenção)</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 pl-2 pr-8 focus:ring-primary focus:border-primary h-[34px]"
                aria-label="Filtrar por SLA"
              >
                <option value="Todos">Todos</option>
                <option value={PatientStatus.DUE_TODAY}>Atenção</option>
                <option value={PatientStatus.LATE}>Atrasado</option>
                <option value={PatientStatus.ON_TIME}>No Prazo</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="h-[34px] px-3 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold text-xs uppercase tracking-wider"
                title="Limpar Filtros"
              >
                Limpar
              </button>
              <button
                onClick={handleApplyFilters}
                className="h-[34px] w-[34px] flex items-center justify-center rounded-md bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
                title="Filtrar"
              >
                <span className="material-symbols-outlined text-lg">search</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fff5f7] dark:bg-[#351a21] text-[#9a4c5f] dark:text-[#c4a1a9] text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Paciente</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Procedimento</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Progresso</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Status</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-primary/10">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, index) => {
                  const { patient, treatment, dynamicStatus, dueDate } = row;
                  return (
                    <tr
                      key={treatment.id}
                      className={`transition-colors cursor-pointer group border-b border-gray-100 dark:border-white/5 last:border-0 ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/5'
                        } hover:bg-gray-100 dark:hover:bg-primary/10`}
                      onClick={() => onPatientSelect(patient.id, treatment.id)}
                    >
                      <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gray-200 dark:bg-primary/20 flex items-center justify-center text-gray-700 dark:text-primary font-bold text-xs">
                            {patient.avatar ? (
                              <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              patient.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{patient.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{patient.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{treatment.procedureName}</p>
                        <p className="text-xs text-gray-500 font-medium whitespace-nowrap">Início: {new Date(treatment.startedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                            <span>{Math.round(treatment.progress || 0)}%</span>
                            <span>{treatment.tasksCompleted}/{treatment.totalTasks}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${treatment.progress === 100 ? 'bg-green-500' : 'bg-primary'
                                }`}
                              style={{ width: `${treatment.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                        {treatment.status === 'completed' ? (
                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="material-symbols-outlined text-blue-500 text-sm">check_circle</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400">
                                Concluído
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold tracking-tight text-blue-600 dark:text-blue-400">
                              Finalizado
                            </div>
                          </div>
                        ) : treatment.status === 'cancelled' ? (
                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-gray-50 border-gray-100 dark:bg-gray-900/10 dark:border-gray-900/30">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="material-symbols-outlined text-gray-500 text-sm">cancel</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-700 dark:text-gray-400">
                                Cancelado
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold tracking-tight text-gray-600 dark:text-gray-400">
                              Arquivado
                            </div>
                          </div>
                        ) : dynamicStatus === PatientStatus.LATE && dueDate ? (
                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="size-2 rounded-full bg-red-500"></span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 dark:text-red-400">
                                Atrasado
                              </span>
                            </div>
                            <CountdownTimer targetDate={dueDate} isOverdue={true} />
                          </div>
                        ) : dynamicStatus === PatientStatus.DUE_TODAY && dueDate ? (
                          <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg border ${getSLAStatus(dueDate) === 'warning'
                            ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                            : 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30'
                            }`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`size-2 rounded-full ${getSLAStatus(dueDate) === 'warning' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'
                                }`}></span>
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${getSLAStatus(dueDate) === 'warning' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                                }`}>
                                {getSLAStatus(dueDate) === 'warning' ? 'Atenção' : 'Vence Hoje'}
                              </span>
                            </div>
                            <CountdownTimer targetDate={dueDate} isWarning={getSLAStatus(dueDate) === 'warning'} />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="size-2 rounded-full bg-green-500"></span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-green-700 dark:text-green-400">
                                No Prazo
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold tracking-tight text-green-600 dark:text-green-400">
                              {dueDate ? dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            className="size-8 flex items-center justify-center rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-400 transition-colors"
                            title="WhatsApp"
                            onClick={(e) => {
                              e.stopPropagation();
                              const phone = patient.phone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${phone}`, '_blank');
                            }}
                          >
                            <svg viewBox="0 0 24 24" className="size-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                          </button>
                          <button
                            className="size-8 flex items-center justify-center rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400 transition-colors"
                            title="Ver Detalhes"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPatientSelect(patient.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">
                        {!hasLoadedOnce ? 'manage_search' : 'assignment_late'}
                      </span>
                      <p className="text-sm font-medium">
                        {!hasLoadedOnce 
                          ? 'Utilize os filtros acima para listar os protocolos.' 
                          : 'Nenhum protocolo encontrado para os filtros selecionados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Polished Countdown Component
const CountdownTimer = ({ targetDate, isWarning, isOverdue }: { targetDate: Date, isWarning?: boolean, isOverdue?: boolean }) => {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      let diff = targetDate.getTime() - now.getTime();

      let prefix = '';

      // If overdue, count UP (past time)
      if (diff < 0) {
        diff = Math.abs(diff);
        prefix = '+ ';
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const timeString = hours > 0
        ? `${hours}h ${minutes.toString().padStart(2, '0')}m`
        : `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

      setTimeLeft(`${prefix}${timeString}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className={`font-mono text-xs font-bold tracking-tight ${isOverdue
      ? 'text-red-700 dark:text-red-400'
      : isWarning
        ? 'text-red-600 dark:text-red-400'
        : 'text-orange-600 dark:text-orange-400'
      }`}>
      {timeLeft}
    </div>
  );
}

export default Dashboard;
