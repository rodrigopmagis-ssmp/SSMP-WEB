
import React, { useState } from 'react';
import { Patient, PatientStatus, Procedure, PatientTreatment } from '../types';
import { calculateDueDate, getSLAStatus } from '../src/utils/sla';

interface DashboardProps {
  patients: Patient[];
  procedures: Procedure[];
  activeTreatments?: PatientTreatment[];
  onPatientSelect: (id: string) => void;
  onNewRegistration: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ patients, procedures, activeTreatments = [], onPatientSelect, onNewRegistration }) => {
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Map treatments to display rows (joining with patient data)
  // Map treatments to display rows (joining with patient data)
  const treatmentRows = activeTreatments.map(treatment => {
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

  // Aplicar filtro de status
  const filteredRows = statusFilter === 'Todos'
    ? treatmentRows
    : treatmentRows.filter(row => row.dynamicStatus === statusFilter);

  // Calcular estatísticas
  const stats = {
    totalPatients: patients.length, // Total unique patients
    totalOpenProtocols: activeTreatments.length,
    dueToday: treatmentRows.filter(r => r.dynamicStatus === PatientStatus.DUE_TODAY).length,
    overdue: treatmentRows.filter(r => r.dynamicStatus === PatientStatus.LATE).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Functional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#2d181e] p-6 rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Painel de Controle</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral da operação e protocolos ativos.</p>
        </div>
        <button
          onClick={onNewRegistration}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
          NOVO PACIENTE
        </button>
      </div>

      {/* Stats Overview - Dense & Readable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-pink-50/40 dark:bg-pink-900/10 rounded-2xl p-6 shadow-sm border border-pink-100/50 dark:border-pink-800/30 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-pink-900/60 dark:text-pink-400 uppercase tracking-wider mb-1">Total Pacientes</p>
            <h3 className="text-3xl font-black text-gray-800 dark:text-white">{stats.totalPatients}</h3>
          </div>
          <div className="size-12 rounded-xl bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 dark:text-pink-400 shadow-inner">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
        </div>

        <div className="bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl p-6 shadow-sm border border-blue-100/50 dark:border-blue-800/30 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-blue-900/60 dark:text-blue-400 uppercase tracking-wider mb-1">Em Tratamento</p>
            <h3 className="text-3xl font-black text-gray-800 dark:text-white">{stats.totalOpenProtocols}</h3>
          </div>
          <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <span className="material-symbols-outlined text-2xl">assignment</span>
          </div>
        </div>

        <div className="bg-orange-50/40 dark:bg-orange-900/10 rounded-2xl p-6 shadow-sm border border-orange-100/50 dark:border-orange-800/30 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-orange-900/60 dark:text-orange-400 uppercase tracking-wider mb-1">Atenção Hoje</p>
            <h3 className="text-3xl font-black text-gray-800 dark:text-white">{stats.dueToday}</h3>
          </div>
          <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
            <span className="material-symbols-outlined text-2xl">notifications_active</span>
          </div>
        </div>

        <div className="bg-red-50/40 dark:bg-red-900/10 rounded-2xl p-6 shadow-sm border border-red-100/50 dark:border-red-800/30 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-red-900/60 dark:text-red-400 uppercase tracking-wider mb-1">Atrasados</p>
            <h3 className="text-3xl font-black text-gray-800 dark:text-white">{stats.overdue}</h3>
          </div>
          <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
            <span className="material-symbols-outlined text-2xl">warning</span>
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

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 uppercase">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-[#2d181e] border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 py-1 pl-2 pr-8 focus:ring-primary focus:border-primary"
            >
              <option value="Todos">Todos</option>
              <option value={PatientStatus.DUE_TODAY}>Atenção</option>
              <option value={PatientStatus.LATE}>Atrasado</option>
              <option value={PatientStatus.ON_TIME}>No Prazo</option>
            </select>
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
                      onClick={() => onPatientSelect(patient.id)}
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
                        {dynamicStatus === PatientStatus.LATE && dueDate ? (
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
                      <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">assignment_late</span>
                      <p className="text-sm font-medium">Nenhum protocolo encontrado neste filtro.</p>
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
