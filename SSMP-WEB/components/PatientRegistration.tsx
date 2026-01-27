
import React, { useState } from 'react';
import { Patient, PatientStatus } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import { validateCPF, validateEmail, formatCPF, formatPhone, normalize } from '../src/utils/validators';

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply visual formatting on load if editing
  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        phone: formatPhone(initialData.phone),
        cpf: initialData.cpf ? formatCPF(initialData.cpf) : ''
      }));
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.phone) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (normalize(formData.phone).length < 10) {
      newErrors.phone = 'Telefone inválido';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (formData.cpf) {
      if (!validateCPF(formData.cpf)) {
        newErrors.cpf = 'CPF inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    let formattedValue = value;

    // Apply masks
    if (field === 'phone') {
      formattedValue = formatPhone(value);
    } else if (field === 'cpf') {
      formattedValue = formatCPF(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const newPatient: Patient = {
        id: initialData?.id || Math.random().toString(36).substr(2, 9),
        name: formData.name,
        phone: normalize(formData.phone), // Save raw numbers only
        email: formData.email,
        dob: formData.dob,
        cpf: normalize(formData.cpf), // Save raw numbers only
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

      await onSave(newPatient);
    } catch (error) {
      console.error("Error saving patient", error);
    } finally {
      setIsSubmitting(false);
    }
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
          disabled={isSubmitting}
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
              onChange={e => handleChange('name', e.target.value)}
              error={errors.name}
              disabled={isSubmitting}
            />
            <Input
              label="WhatsApp / Telefone"
              required
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              error={errors.phone}
              maxLength={15}
              disabled={isSubmitting}
            />
            <Input
              label="E-mail"
              placeholder="paciente@exemplo.com"
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              error={errors.email}
              disabled={isSubmitting}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              value={formData.dob}
              onChange={e => handleChange('dob', e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="CPF (Opcional)"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={e => handleChange('cpf', e.target.value)}
              error={errors.cpf}
              maxLength={14}
              disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="px-10 py-3 transform hover:scale-105 active:scale-95 transition-transform"
            isLoading={isSubmitting}
          >
            {initialData ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;
