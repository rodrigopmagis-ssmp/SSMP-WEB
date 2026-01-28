
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
    gender: initialData?.gender || '',
    maritalStatus: initialData?.maritalStatus || '',

    profession: initialData?.profession || '',
    rg: initialData?.rg || '',
    cnpj: initialData?.cnpj || '',
    race: initialData?.race || '',
    origin: initialData?.origin || '',
    healthInsurance: initialData?.healthInsurance || '',

    // Address fields
    addressZip: '',
    addressState: '',
    addressCity: '',
    addressNeighborhood: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressCountry: 'Brasil'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply visual formatting on load if editing
  React.useEffect(() => {
    if (initialData) {
      const addressParts = initialData.address ? initialData.address.split(', ') : [];
      // Expected format: Street, Number, Complement, Neighborhood, City/State, ZipCode
      // But if complement is missing or format varies, this is brittle. 
      // We will try best effort mapping based on the example: 
      // "Avenida Doutor Altino Arantes, 820, Ap 104, Vila Clementino, São Paulo/SP, 04042-002"

      let zip = '', state = '', city = '', hood = '', street = '', num = '', comp = '';

      if (addressParts.length >= 6) {
        street = addressParts[0] || '';
        num = addressParts[1] || '';
        comp = addressParts[2] || '';
        hood = addressParts[3] || '';
        const cityState = (addressParts[4] || '').split('/');
        city = cityState[0] || '';
        state = cityState[1] || '';
        zip = addressParts[5] || '';
      } else if (addressParts.length === 5) {
        // Maybe complement is missing?
        // Street, Number, Neighborhood, City/State, ZipCode
        street = addressParts[0] || '';
        num = addressParts[1] || '';
        hood = addressParts[2] || '';
        const cityState = (addressParts[3] || '').split('/');
        city = cityState[0] || '';
        state = cityState[1] || '';
        zip = addressParts[4] || '';
      }

      setFormData(prev => ({
        ...prev,
        phone: formatPhone(initialData.phone),
        cpf: initialData.cpf ? formatCPF(initialData.cpf) : '',
        gender: initialData.gender || '',
        maritalStatus: initialData.maritalStatus || '',

        profession: initialData.profession || '',
        rg: initialData.rg || '',
        cnpj: initialData.cnpj || '',
        race: initialData.race || '',
        origin: initialData.origin || '',
        healthInsurance: initialData.healthInsurance || '',

        addressZip: zip,
        addressState: state,
        addressCity: city,
        addressNeighborhood: hood,
        addressStreet: street,
        addressNumber: num,
        addressComplement: comp
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

    // Address Validations
    if (formData.addressZip || formData.addressStreet || formData.addressNumber) {
      if (!formData.addressZip) newErrors.addressZip = 'CEP obrigatório';
      if (!formData.addressState) newErrors.addressState = 'Estado obrigatório';
      if (!formData.addressCity) newErrors.addressCity = 'Cidade obrigatória';
      if (!formData.addressNeighborhood) newErrors.addressNeighborhood = 'Bairro obrigatório';
      if (!formData.addressStreet) newErrors.addressStreet = 'Rua obrigatória';
      if (!formData.addressNumber) newErrors.addressNumber = 'Número obrigatório';
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
        cpf: formData.cpf,
        // Default empty values for new patient
        // Default empty values for new patient
        procedures: initialData?.procedures || [],
        procedureDate: initialData?.procedureDate || '',
        lastVisit: initialData?.lastVisit || '-',
        status: initialData?.status || PatientStatus.ON_TIME,
        progress: initialData?.progress || 0,
        tasksCompleted: initialData?.tasksCompleted || 0,
        totalTasks: initialData?.totalTasks || 0,
        // photos: initialData?.photos || [], // Deprecated
        gender: formData.gender as any,
        maritalStatus: formData.maritalStatus,
        profession: formData.profession,
        rg: formData.rg,
        cnpj: formData.cnpj,
        race: formData.race,
        origin: formData.origin,
        healthInsurance: formData.healthInsurance,
        address: `${formData.addressStreet}, ${formData.addressNumber}, ${formData.addressComplement}, ${formData.addressNeighborhood}, ${formData.addressCity}/${formData.addressState}, ${formData.addressZip}`
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Gênero</label>
              <select
                value={formData.gender}
                onChange={e => handleChange('gender', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isSubmitting}
              >
                <option value="">Selecione...</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Estado Civil</label>
              <select
                value={formData.maritalStatus}
                onChange={e => handleChange('maritalStatus', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isSubmitting}
              >
                <option value="">Selecione...</option>
                <option value="Solteiro">Solteiro(a)</option>
                <option value="Casado">Casado(a)</option>
                <option value="Divorciado">Divorciado(a)</option>
                <option value="Viúvo">Viúvo(a)</option>
              </select>
            </div>

            <Input
              label="Profissão"
              placeholder="Ex: Advogada"
              value={formData.profession}
              onChange={e => handleChange('profession', e.target.value)}
              disabled={isSubmitting}
            />

            <Input
              label="RG"
              placeholder="00.000.000-0"
              value={formData.rg}
              onChange={e => handleChange('rg', e.target.value)}
              disabled={isSubmitting}
            />

            <Input
              label="CNPJ (Opcional)"
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={e => handleChange('cnpj', e.target.value)}
              disabled={isSubmitting}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cor / Raça</label>
              <select
                value={formData.race}
                onChange={e => handleChange('race', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isSubmitting}
              >
                <option value="">Selecione...</option>
                <option value="Branca">Branca</option>
                <option value="Preta">Preta</option>
                <option value="Parda">Parda</option>
                <option value="Amarela">Amarela</option>
                <option value="Indígena">Indígena</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Origem</label>
              <select
                value={formData.origin}
                onChange={e => handleChange('origin', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isSubmitting}
              >
                <option value="">Selecione...</option>
                <option value="email">E-mail</option>
                <option value="facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="Indicação">Indicação</option>
                <option value="Instagram">Instagram</option>
                <option value="Linkedin">Linkedin</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <Input
              label="Convênio"
              placeholder="Ex: Unimed"
              value={formData.healthInsurance}
              onChange={e => handleChange('healthInsurance', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">location_on</span>
            Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="fixed-input">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">País</label>
              <div className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center">
                Brasil
              </div>
            </div>
            <div>
              <Input
                label="Código postal*"
                placeholder="00000-000"
                value={formData.addressZip}
                onChange={e => handleChange('addressZip', e.target.value)}
                error={errors.addressZip}
                disabled={isSubmitting}
              />
              {/* Would add Search CEP button here if implementing API */}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Estado*</label>
              <select
                value={formData.addressState}
                onChange={e => handleChange('addressState', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isSubmitting}
              >
                <option value="">Selecione</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="ES">Espírito Santo</option>
                {/* Add more states as needed or make generic text input if preferred, but Select is in image */}
              </select>
              {errors.addressState && <span className="text-xs text-red-500">{errors.addressState}</span>}
            </div>

            <Input
              label="Cidade*"
              placeholder="Selecione ou Digite"
              value={formData.addressCity}
              onChange={e => handleChange('addressCity', e.target.value)}
              error={errors.addressCity}
              disabled={isSubmitting}
            />

            <Input
              label="Bairro*"
              placeholder="Digite"
              value={formData.addressNeighborhood}
              onChange={e => handleChange('addressNeighborhood', e.target.value)}
              error={errors.addressNeighborhood}
              disabled={isSubmitting}
            />

            <Input
              label="Rua*"
              placeholder="Digite"
              value={formData.addressStreet}
              onChange={e => handleChange('addressStreet', e.target.value)}
              error={errors.addressStreet}
              disabled={isSubmitting}
            />

            <Input
              label="Número*"
              placeholder="Digite"
              value={formData.addressNumber}
              onChange={e => handleChange('addressNumber', e.target.value)}
              error={errors.addressNumber}
              disabled={isSubmitting}
            />

            <Input
              label="Complemento"
              placeholder="Digite"
              value={formData.addressComplement}
              onChange={e => handleChange('addressComplement', e.target.value)}
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
