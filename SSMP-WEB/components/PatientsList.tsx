
import React, { useState } from 'react';
import { Patient, PatientStatus } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';

interface PatientsListProps {
  patients: Patient[];
  onPatientSelect: (id: string) => void;
}

const PatientsList: React.FC<PatientsListProps> = ({ patients, onPatientSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.procedures.some(proc => proc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col bg-white dark:bg-[#2d181e] p-4 rounded-xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a4c5f] z-10">search</span>
            <Input
              className="pl-10 h-10"
              placeholder="Buscar por nome do paciente ou procedimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#9a4c5f] uppercase tracking-wider">Data:</span>
            <input className="rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary text-sm py-2 px-3 h-10 outline-none" type="date" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#9a4c5f] uppercase tracking-wider">Status:</span>
            <select className="rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary text-sm py-2 px-3 pr-8 h-10 outline-none">
              <option>Todos os Status</option>
              <option>Vence Hoje</option>
              <option>Atrasado</option>
              <option>No Prazo</option>
            </select>
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="h-10"
          >
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Mais Filtros
          </Button>
        </div>

        {/* Extended Filters Section */}
        {showFilters && (
          <div className="pt-4 border-t border-[#f3e7ea] dark:border-[#3d242a] animate-in slide-in-from-top-2 fade-in duration-200">
            <h3 className="text-xs font-bold text-[#9a4c5f] uppercase tracking-wider mb-3">Filtros Avançados</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input label="Médico Responsável" placeholder="Ex: Dr. Silva" className="h-10" />
              </div>
              <div>
                <label className="flex flex-col gap-2 w-full">
                  <span className="text-sm font-bold text-[#1b0d11] dark:text-white">Unidade</span>
                  <select className="rounded-xl border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary h-10 px-4 outline-none">
                    <option>Todas as Unidades</option>
                    <option>Unidade Jardins</option>
                    <option>Unidade Moema</option>
                  </select>
                </label>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" className="w-full h-10 justify-start" onClick={() => { setSearchTerm(''); setShowFilters(false); }}>
                  <span className="material-symbols-outlined text-sm">close</span>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-[#2d181e] rounded-xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fff5f7] dark:bg-[#351a21] text-[#9a4c5f] dark:text-[#c4a1a9] text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Paciente</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Procedimento e Data</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Em Aberto</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Concluídos</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Status</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3e7ea] dark:divide-[#3d242a]">
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => onPatientSelect(patient.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {patient.avatar ? (
                          <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary font-bold">{patient.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{patient.name}</p>
                        <p className="text-xs text-[#9a4c5f]">{patient.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium">{patient.procedures.join(', ')}</div>
                    <div className="text-xs text-[#9a4c5f]">{patient.procedureDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-lg bg-orange-100/80 text-orange-700 text-xs font-bold border border-orange-200">
                      {patient.activeTreatmentsCount || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-lg bg-green-100/80 text-green-700 text-xs font-bold border border-green-200">
                      {patient.completedTreatmentsCount || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${patient.status === PatientStatus.DUE_TODAY ? 'bg-primary/20 text-primary border-primary/30' :
                      patient.status === PatientStatus.LATE ? 'bg-red-100 text-red-600 border-red-200' :
                        'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="size-8 flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-lg">chat</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-[#fcf8f9] dark:bg-[#2d181e] border-t border-[#f3e7ea] dark:border-[#3d242a] flex items-center justify-between">
          <p className="text-sm text-[#9a4c5f]">Mostrando {filteredPatients.length} de {patients.length} pacientes</p>
          <div className="flex gap-2">
            <Button variant="outline" className="px-3 py-1 h-8 text-sm">Anterior</Button>
            <Button variant="primary" className="px-3 py-1 h-8 text-sm">1</Button>
            <Button variant="outline" className="px-3 py-1 h-8 text-sm">Próximo</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PatientsList;
