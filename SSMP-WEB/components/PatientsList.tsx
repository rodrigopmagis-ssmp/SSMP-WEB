
import React, { useState } from 'react';
import { Patient, PatientStatus } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import { supabaseService } from '../src/services/supabaseService';

interface PatientsListProps {
  patients: Patient[];
  onPatientSelect: (id: string) => void;
  onNewRegistration: () => void;
}

const PatientsList: React.FC<PatientsListProps> = ({ patients, onPatientSelect, onNewRegistration }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  React.useEffect(() => {
    supabaseService.getTags().then(setTags).catch(console.error);
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.procedures.some(proc => proc.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = selectedTag
      ? p.tags?.some(t => t.id === selectedTag)
      : true;

    return matchesSearch && matchesTag;
  });

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

          <Button
            variant="primary"
            onClick={onNewRegistration}
            className="h-10 shadow-md"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Novo Paciente
          </Button>

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
              <div>
                <Input label="Médico Responsável" placeholder="Ex: Dr. Silva" className="h-10" />
              </div>

              <div>
                <label className="flex flex-col gap-2 w-full">
                  <span className="text-sm font-bold text-[#1b0d11] dark:text-white">Etiqueta</span>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="rounded-xl border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary h-10 px-4 outline-none"
                  >
                    <option value="">Todas as Etiquetas</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" className="w-full h-10 justify-start" onClick={() => { setSearchTerm(''); setSelectedTag(''); setShowFilters(false); }}>
                  <span className="material-symbols-outlined text-sm">close</span>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-[#2d181e] rounded-xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] overflow-hidden">
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fff5f7] dark:bg-[#351a21] text-[#9a4c5f] dark:text-[#c4a1a9] text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Paciente</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Procedimento e Data</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Em Aberto</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Concluídos</th>
                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Etiquetas</th>
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
                    <div className="flex flex-wrap gap-1">
                      {patient.tags && patient.tags.length > 0 ? (
                        patient.tags.map(tag => (
                          <div
                            key={tag.id}
                            title={tag.metadata?.complaint ? `Reclamação: ${tag.metadata.complaint}` : tag.name}
                            className="size-4 rounded-md shadow-sm border border-black/5"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.metadata?.complaint && (
                              <span className="flex items-center justify-center w-full h-full text-[10px] text-white">
                                !
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {patient.phone ? (
                        <a
                          href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="size-8 flex items-center justify-center rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all transform group-hover:scale-110"
                          title="WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-lg">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                          </span>
                        </a>
                      ) : null}
                      <button
                        className="size-8 flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-all transform group-hover:scale-110"
                        title="Chat Interno"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-lg">chat</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[#f3e7ea] dark:divide-[#3d242a]">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="p-4 hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={() => onPatientSelect(patient.id)}
            >
              {/* Header: Avatar, Name & Phone */}
              <div className="flex items-start gap-4 mb-3">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {patient.avatar ? (
                    <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-lg">{patient.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{patient.name}</p>
                  <p className="text-sm text-[#9a4c5f]">{patient.phone || 'Sem telefone'}</p>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {patient.tags && patient.tags.length > 0 ? (
                      patient.tags.map(tag => (
                        <div
                          key={tag.id}
                          title={tag.metadata?.complaint ? `Reclamação: ${tag.metadata.complaint}` : tag.name}
                          className="size-3.5 rounded-sm shadow-sm border border-black/5"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.metadata?.complaint && (
                            <span className="flex items-center justify-center w-full h-full text-[8px] text-white font-bold">
                              !
                            </span>
                          )}
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Procedure Info */}
              <div className="bg-gray-50 dark:bg-black/10 rounded-lg p-3 mb-3 border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-0.5">Procedimentos</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                      {patient.procedures.length > 0 ? patient.procedures.join(', ') : 'Nenhum'}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-0.5">Data</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{patient.procedureDate || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Footer: Stats & Actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-orange-100/80 text-orange-800 text-xs font-bold border border-orange-200" title="Tratamentos em Aberto">
                    <span className="size-1.5 rounded-full bg-orange-500"></span>
                    {patient.activeTreatmentsCount || 0}
                  </span>
                  <span className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-green-100/80 text-green-800 text-xs font-bold border border-green-200" title="Tratamentos Concluídos">
                    <span className="size-1.5 rounded-full bg-green-500"></span>
                    {patient.completedTreatmentsCount || 0}
                  </span>
                </div>

                <div className="flex gap-2">
                  {patient.phone ? (
                    <a
                      href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 flex items-center justify-center rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm transition-colors"
                      title="WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-lg">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                      </span>
                    </a>
                  ) : null}
                  <button
                    className="size-9 flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm transition-colors"
                    title="Chat Interno"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
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
