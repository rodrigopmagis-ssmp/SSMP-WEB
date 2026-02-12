import React, { useState } from 'react';
import { Procedure } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface ProcedureRegistrationProps {
    onSave: (procedure: Procedure) => void;
    onCancel: () => void;
}

const ProcedureRegistration: React.FC<ProcedureRegistrationProps> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        icon: 'healing',
        description: '',
        price: '',
        promotional_price: '',
        use_in_budget: false,
        budget_description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newProcedure: Procedure = {
            id: Math.random().toString(36).substr(2, 9),
            name: formData.name,
            icon: formData.icon,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : null,
            promotional_price: formData.promotional_price ? parseFloat(formData.promotional_price) : null,
            use_in_budget: formData.use_in_budget,
            budget_description: formData.budget_description,
            scripts: []
        };
        onSave(newProcedure);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1b0d11] dark:text-white">Novo Procedimento</h1>
                    <p className="text-[#9a4c5f] dark:text-[#c4a1a9]">Cadastre um novo tipo de procedimento e seus protocolos</p>
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
                <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] p-8">
                    <div className="flex flex-col gap-6">
                        <Input
                            label="Nome do Procedimento"
                            required
                            placeholder="Ex: Harmonização Facial"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />

                        <Input
                            label="Nome do Ícone (Material Symbols)"
                            placeholder="Ex: face"
                            value={formData.icon}
                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                        />
                        <p className="text-xs text-[#9a4c5f] -mt-4">
                            Consulte os nomes em <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" className="underline">Google Fonts Icons</a>
                        </p>

                        <label className="flex flex-col gap-2 w-full">
                            <span className="text-sm font-bold text-[#1b0d11] dark:text-white">Descrição</span>
                            <textarea
                                className="rounded-xl border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary min-h-[100px] p-4 outline-none"
                                placeholder="Descrição breve do procedimento..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </label>

                        <div className="border-t border-[#f3e7ea] dark:border-[#3d242a] pt-6 mt-2">
                            <h3 className="text-lg font-bold text-[#1b0d11] dark:text-white mb-4">Informações de Orçamento</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <Input
                                    label="Valor (R$)"
                                    type="number"
                                    placeholder="0,00"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                                <Input
                                    label="Valor Promocional (R$)"
                                    type="number"
                                    placeholder="0,00"
                                    value={formData.promotional_price}
                                    onChange={e => setFormData({ ...formData, promotional_price: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded text-primary focus:ring-primary border-[#f3e7ea]"
                                        checked={formData.use_in_budget}
                                        onChange={e => setFormData({ ...formData, use_in_budget: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-[#1b0d11] dark:text-white">Disponível para Orçamento</span>
                                </label>

                                {formData.use_in_budget && (
                                    <label className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2">
                                        <span className="text-sm font-bold text-[#1b0d11] dark:text-white">Descrição para Orçamento</span>
                                        <textarea
                                            className="rounded-xl border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary min-h-[80px] p-4 outline-none"
                                            placeholder="Descrição detalhada que aparecerá no orçamento..."
                                            value={formData.budget_description}
                                            onChange={e => setFormData({ ...formData, budget_description: e.target.value })}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
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
                        className="px-10 py-3"
                    >
                        Salvar Procedimento
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ProcedureRegistration;
