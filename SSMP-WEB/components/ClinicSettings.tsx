import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { Clinic } from '../types';
import { formatCPF, formatPhone, formatCNPJ, formatZipCode, validateCPF, validateCNPJ, validateEmail } from '../src/utils/validators';
import Toast from './ui/Toast';

interface ClinicSettingsProps {
    onBack: () => void;
}

const ClinicSettings: React.FC<ClinicSettingsProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);

    // Form State
    const [clinic, setClinic] = useState<Partial<Clinic>>({
        type: 'fisica',
        country: 'Brasil',
        has_address: true,
        cpf_cnpj: '',
        fantasy_name: '',
        owner_name: '',
        business_name: '',
        phone: '',
        email: '',
        zip_code: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        same_address_for_billing: false,
        billing_zip_code: '',
        billing_street: '',
        billing_number: '',
        billing_complement: '',
        billing_neighborhood: '',
        billing_city: '',
        billing_state: '',
        billing_country: 'Brasil'
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadClinicData();
    }, []);

    const loadClinicData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await import('../src/lib/supabase').then(m => m.supabase.auth.getUser());

            if (user) {
                const data = await supabaseService.getClinic(user.id);
                if (data) {
                    setClinic(data);
                    if (data.logo_url) setLogoPreview(data.logo_url);
                } else {
                    setClinic(prev => ({ ...prev, email: user.email }));
                }
            }
        } catch (error) {
            console.error("Error loading clinic", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const objectUrl = URL.createObjectURL(file);
        setLogoPreview(objectUrl);
        setUploadingLogo(true);

        try {
            const { data: { user } } = await import('../src/lib/supabase').then(m => m.supabase.auth.getUser());
            if (!user) throw new Error("No user");

            const publicUrl = await supabaseService.uploadClinicLogo(user.id, file);
            setClinic(prev => ({ ...prev, logo_url: publicUrl }));
        } catch (error) {
            console.error("Error uploading logo", error);
            alert("Erro ao fazer upload do logo.");
        } finally {
            setUploadingLogo(false);
        }
    };

    // Auto-fill billing address when checkbox is checked
    useEffect(() => {
        if (clinic.same_address_for_billing) {
            setClinic(prev => ({
                ...prev,
                billing_zip_code: prev.zip_code,
                billing_street: prev.street,
                billing_number: prev.number,
                billing_complement: prev.complement,
                billing_neighborhood: prev.neighborhood,
                billing_city: prev.city,
                billing_state: prev.state,
                billing_country: prev.country
            }));
        }
    }, [clinic.same_address_for_billing, clinic.zip_code, clinic.street, clinic.number, clinic.complement, clinic.neighborhood, clinic.city, clinic.state, clinic.country]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!clinic.owner_name) newErrors.owner_name = "Nome do responsável é obrigatório";
        if (!clinic.fantasy_name) newErrors.fantasy_name = "Nome fantasia é obrigatório";

        if (!clinic.email) {
            newErrors.email = "E-mail é obrigatório";
        } else if (!validateEmail(clinic.email)) {
            newErrors.email = "E-mail inválido";
        }

        if (!clinic.phone) newErrors.phone = "Telefone é obrigatório";

        if (!clinic.cpf_cnpj) {
            newErrors.cpf_cnpj = "CPF/CNPJ é obrigatório";
        } else {
            const isValid = clinic.type === 'juridica'
                ? validateCNPJ(clinic.cpf_cnpj)
                : validateCPF(clinic.cpf_cnpj);

            if (!isValid) newErrors.cpf_cnpj = `${clinic.type === 'juridica' ? 'CNPJ' : 'CPF'} inválido`;
        }

        if (clinic.has_address) {
            if (!clinic.zip_code) newErrors.zip_code = "CEP é obrigatório";
            if (!clinic.street) newErrors.street = "Rua é obrigatória";
            if (!clinic.number) newErrors.number = "Número é obrigatório";
            if (!clinic.neighborhood) newErrors.neighborhood = "Bairro é obrigatório";
            if (!clinic.city) newErrors.city = "Cidade é obrigatória";
            if (!clinic.state) newErrors.state = "Estado é obrigatório";
        }

        // Validate billing address always (required now per user request implicitly "ela tem que cadastrar o endereço de cobrança")
        if (!clinic.billing_zip_code) newErrors.billing_zip_code = "CEP de cobrança é obrigatório";
        if (!clinic.billing_street) newErrors.billing_street = "Rua de cobrança é obrigatória";
        if (!clinic.billing_number) newErrors.billing_number = "Número de cobrança é obrigatório";
        if (!clinic.billing_neighborhood) newErrors.billing_neighborhood = "Bairro de cobrança é obrigatório";
        if (!clinic.billing_city) newErrors.billing_city = "Cidade de cobrança é obrigatória";
        if (!clinic.billing_state) newErrors.billing_state = "Estado de cobrança é obrigatório";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        try {
            setSaving(true);

            // Sanitize data before sending
            const cleanClinic = {
                ...clinic,
                state: clinic.state?.trim().toUpperCase().slice(0, 2),
                billing_state: clinic.billing_state?.trim().toUpperCase().slice(0, 2)
            };

            await supabaseService.upsertClinic(cleanClinic);
            setToast({ message: "Dados salvos com sucesso!", type: 'success', visible: true });
        } catch (error: any) {
            console.error("Error saving clinic", error);
            const errorMessage = error.message || "Erro ao salvar dados.";
            setToast({ message: `Erro: ${errorMessage}`, type: 'error', visible: true });
        } finally {
            setSaving(false);
        }
    };

    const handleZipCodeBlur = async (type: 'commercial' | 'billing') => {
        const cep = type === 'commercial' ? clinic.zip_code : clinic.billing_zip_code;

        if (cep?.length === 9) { // 12345-678
            try {
                const cleanCep = cep.replace(/\D/g, '');
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();

                if (!data.erro) {
                    if (type === 'commercial') {
                        setClinic(prev => ({
                            ...prev,
                            street: data.logradouro,
                            neighborhood: data.bairro,
                            city: data.localidade,
                            state: data.uf,
                            country: 'Brasil'
                        }));
                        setErrors(prev => {
                            const next = { ...prev };
                            delete next.street; delete next.neighborhood; delete next.city; delete next.state;
                            return next;
                        });
                    } else {
                        setClinic(prev => ({
                            ...prev,
                            billing_street: data.logradouro,
                            billing_neighborhood: data.bairro,
                            billing_city: data.localidade,
                            billing_state: data.uf,
                            billing_country: 'Brasil'
                        }));
                        setErrors(prev => {
                            const next = { ...prev };
                            delete next.billing_street; delete next.billing_neighborhood; delete next.billing_city; delete next.billing_state;
                            return next;
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching CEP", error);
            }
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Carregando dados da clínica...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-20">
            {toast && toast.visible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações da Clínica</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie os dados da sua clínica e informações de contato.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Dados da Clínica Section */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        Dados da clínica
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Form Fields */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de pessoa*
                                </label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                    <button
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${clinic.type === 'fisica' ? 'bg-white dark:bg-gray-700 shadow text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                                        onClick={() => setClinic({ ...clinic, type: 'fisica', cpf_cnpj: '' })}
                                    >
                                        Física
                                    </button>
                                    <button
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${clinic.type === 'juridica' ? 'bg-white dark:bg-gray-700 shadow text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                                        onClick={() => setClinic({ ...clinic, type: 'juridica', cpf_cnpj: '' })}
                                    >
                                        Jurídica
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    {clinic.type === 'juridica' ? 'CNPJ*' : 'CPF*'}
                                </label>
                                <input
                                    type="text"
                                    value={clinic.cpf_cnpj}
                                    onChange={(e) => setClinic({
                                        ...clinic,
                                        cpf_cnpj: clinic.type === 'juridica' ? formatCNPJ(e.target.value) : formatCPF(e.target.value)
                                    })}
                                    placeholder={clinic.type === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.cpf_cnpj ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.cpf_cnpj && <p className="text-xs text-red-500 mt-1">{errors.cpf_cnpj}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Nome fantasia*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.fantasy_name}
                                    onChange={(e) => setClinic({ ...clinic, fantasy_name: e.target.value })}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.fantasy_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.fantasy_name && <p className="text-xs text-red-500 mt-1">{errors.fantasy_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Razão Social {clinic.type === 'juridica' ? '*' : '(Opcional)'}
                                </label>
                                <input
                                    type="text"
                                    value={clinic.business_name}
                                    onChange={(e) => setClinic({ ...clinic, business_name: e.target.value })}
                                    placeholder={clinic.type === 'juridica' ? 'Razão social da empresa' : ''}
                                    className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 outline-none bg-gray-50 dark:bg-gray-800 focus:border-primary transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Nome do responsável*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.owner_name}
                                    onChange={(e) => setClinic({ ...clinic, owner_name: e.target.value })}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.owner_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.owner_name && <p className="text-xs text-red-500 mt-1">{errors.owner_name}</p>}
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Logotipo
                            </label>
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="size-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700 relative">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-4xl text-gray-300">image</span>
                                    )}
                                    {uploadingLogo && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="material-symbols-outlined animate-spin text-white">sync</span>
                                        </div>
                                    )}
                                </div>

                                <label className="cursor-pointer">
                                    <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold rounded-lg text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                                        Escolher foto
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg"
                                        className="hidden"
                                        onChange={handleLogoChange}
                                        disabled={uploadingLogo}
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-2">
                                    JPG, PNG ou JPEG. Arraste ou clique para selecionar.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800 my-4"></div>

                {/* Endereço e Contato Section */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        Endereço e contato comercial
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Informe os dados comerciais da sua clínica.
                    </p>

                    <div className="flex items-center gap-2 mb-6">
                        <div
                            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${!clinic.has_address ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'}`}
                            onClick={() => setClinic(prev => ({ ...prev, has_address: !prev.has_address }))}
                        >
                            {!clinic.has_address && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer" onClick={() => setClinic(prev => ({ ...prev, has_address: !prev.has_address }))}>
                            Não possuo endereço comercial
                        </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Telefone*
                            </label>
                            <input
                                type="text"
                                value={clinic.phone}
                                onChange={(e) => setClinic({ ...clinic, phone: formatPhone(e.target.value) })}
                                placeholder="(99) 99999-9999"
                                className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.phone ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                            />
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                E-mail*
                            </label>
                            <input
                                type="email"
                                value={clinic.email}
                                onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                                placeholder="email@clinica.com"
                                className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                            />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                        </div>
                    </div>

                    {clinic.has_address && (
                        <div className="grid md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    País*
                                </label>
                                <select
                                    value={clinic.country}
                                    onChange={(e) => setClinic({ ...clinic, country: e.target.value })}
                                    className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 outline-none bg-gray-50 dark:bg-gray-800 focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="Brasil">Brasil</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Código postal (CEP)*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.zip_code}
                                    onChange={(e) => setClinic({ ...clinic, zip_code: formatZipCode(e.target.value) })}
                                    onBlur={() => handleZipCodeBlur('commercial')}
                                    placeholder="00000-000"
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.zip_code ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.zip_code && <p className="text-xs text-red-500 mt-1">{errors.zip_code}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Estado*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.state}
                                    onChange={(e) => setClinic({ ...clinic, state: e.target.value.toUpperCase().slice(0, 2) })}
                                    maxLength={2}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.state ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Cidade*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.city}
                                    onChange={(e) => setClinic({ ...clinic, city: e.target.value })}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.city ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                            </div>

                            <div className="md:col-span-2 grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Bairro*
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.neighborhood}
                                        onChange={(e) => setClinic({ ...clinic, neighborhood: e.target.value })}
                                        className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.neighborhood ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                    />
                                    {errors.neighborhood && <p className="text-xs text-red-500 mt-1">{errors.neighborhood}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Rua*
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.street}
                                        onChange={(e) => setClinic({ ...clinic, street: e.target.value })}
                                        className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.street ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                    />
                                    {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
                                </div>
                            </div>

                            <div className="md:col-span-2 grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Número*
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.number}
                                        onChange={(e) => setClinic({ ...clinic, number: e.target.value })}
                                        className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.number ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                    />
                                    {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Complemento
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.complement}
                                        onChange={(e) => setClinic({ ...clinic, complement: e.target.value })}
                                        className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 outline-none bg-gray-50 dark:bg-gray-800 focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800 my-4"></div>

                {/* Billing Address Section */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        Endereço de cobrança
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Endereço para faturamento e emissão de notas fiscais.
                    </p>

                    <div className="flex items-center gap-2 mb-6">
                        <div
                            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${clinic.same_address_for_billing ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'}`}
                            onClick={() => setClinic(prev => ({ ...prev, same_address_for_billing: !prev.same_address_for_billing }))}
                        >
                            {clinic.same_address_for_billing && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer" onClick={() => setClinic(prev => ({ ...prev, same_address_for_billing: !prev.same_address_for_billing }))}>
                            O endereço comercial é o mesmo de cobrança
                        </span>
                    </div>

                    {!clinic.same_address_for_billing && (
                        <div className="grid md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    País*
                                </label>
                                <select
                                    value={clinic.billing_country}
                                    onChange={(e) => setClinic({ ...clinic, billing_country: e.target.value })}
                                    className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 outline-none bg-gray-50 dark:bg-gray-800 focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="Brasil">Brasil</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Código postal (CEP)*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.billing_zip_code}
                                    onChange={(e) => setClinic({ ...clinic, billing_zip_code: formatZipCode(e.target.value) })}
                                    onBlur={() => handleZipCodeBlur('billing')}
                                    placeholder="00000-000"
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.billing_zip_code ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.billing_zip_code && <p className="text-xs text-red-500 mt-1">{errors.billing_zip_code}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Estado*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.billing_state}
                                    onChange={(e) => setClinic({ ...clinic, billing_state: e.target.value.toUpperCase().slice(0, 2) })}
                                    maxLength={2}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.billing_state ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.billing_state && <p className="text-xs text-red-500 mt-1">{errors.billing_state}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Cidade*
                                </label>
                                <input
                                    type="text"
                                    value={clinic.billing_city}
                                    onChange={(e) => setClinic({ ...clinic, billing_city: e.target.value })}
                                    className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.billing_city ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                />
                                {errors.billing_city && <p className="text-xs text-red-500 mt-1">{errors.billing_city}</p>}
                            </div>

                            <div className="md:col-span-2 grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Bairro*
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.billing_neighborhood}
                                        onChange={(e) => setClinic({ ...clinic, billing_neighborhood: e.target.value })}
                                        className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.billing_neighborhood ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                    />
                                    {errors.billing_neighborhood && <p className="text-xs text-red-500 mt-1">{errors.billing_neighborhood}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Rua*
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.billing_street}
                                        onChange={(e) => setClinic({ ...clinic, billing_street: e.target.value })}
                                        className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.billing_street ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                    />
                                    {errors.billing_street && <p className="text-xs text-red-500 mt-1">{errors.billing_street}</p>}
                                </div>
                            </div>

                            <div className="md:col-span-2 grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Número*
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.billing_number}
                                        onChange={(e) => setClinic({ ...clinic, billing_number: e.target.value })}
                                        className={`w-full p-3 rounded-lg border-2 outline-none bg-gray-50 dark:bg-gray-800 transition-colors ${errors.billing_number ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary'}`}
                                    />
                                    {errors.billing_number && <p className="text-xs text-red-500 mt-1">{errors.billing_number}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Complemento
                                    </label>
                                    <input
                                        type="text"
                                        value={clinic.billing_complement}
                                        onChange={(e) => setClinic({ ...clinic, billing_complement: e.target.value })}
                                        className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 outline-none bg-gray-50 dark:bg-gray-800 focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onBack}
                        className="px-6 py-3 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                        Salvar Alterações
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ClinicSettings;
