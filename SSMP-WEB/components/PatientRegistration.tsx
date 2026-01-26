
import React, { useState } from 'react';
import { Patient, PatientStatus } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface PatientRegistrationProps {
  onSave: (patient: Patient) => void;
  onCancel: () => void;
  initialData?: Patient;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    dob: initialData?.dob || '',
    cpf: initialData?.cpf || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPatient: Patient = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      dob: formData.dob,
      cpf: formData.cpf,
      // Default empty values for new patient
      procedures: initialData?.procedures || [],
      procedureDate: initialData?.procedureDate || '',
      lastVisit: initialData?.lastVisit || '-',
      status: initialData?.status || PatientStatus.ON_TIME,
      progress: initialData?.progress || 0,
      tasksCompleted: initialData?.tasksCompleted || 0,
      totalTasks: initialData?.totalTasks || 0,
      photos: initialData?.photos || []
    };
    onSave(newPatient);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1b0d11] dark:text-white">{initialData ? 'Editar Cadastro' : 'Novo Paciente'}</h1>
          <p className="text-[#9a4c5f] dark:text-[#c4a1a9]">{initialData ? 'Atualize os dados de contato' : 'Cadastre as informações básicas para contato'}</p>
        </div>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="rounded-full !p-2"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            Dados Pessoais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome Completo"
              required
              placeholder="Ex: Maria Oliveira"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="WhatsApp / Telefone"
              required
              placeholder="+55 (11) 99999-9999"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="E-mail"
              placeholder="paciente@exemplo.com"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              value={formData.dob}
              onChange={e => setFormData({ ...formData, dob: e.target.value })}
            />
            <Input
              label="CPF (Opcional)"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={e => setFormData({ ...formData, cpf: e.target.value })}
            />
          </div>
        </div>

        {/* Detalhes do Procedimento removidos para ProtocolRegistration */}

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
            className="px-10 py-3 transform hover:scale-105 active:scale-95"
          >
            {initialData ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;
