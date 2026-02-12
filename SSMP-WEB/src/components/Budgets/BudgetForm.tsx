import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { Patient, Procedure, Budget } from '../../../types';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';

interface BudgetFormProps {
    initialData?: Budget;
    onSave: () => void;
    onCancel: () => void;
}

interface BudgetFormData {
    patient_id: string;
    status: 'draft' | 'sent' | 'approved' | 'cancelled';
    payment_method: 'pix' | 'credit_card' | 'boleto' | 'cash';
    installments: number;
    card_fee_percent: number;
    valid_until: string;
    items: {
        procedure_id: string;
        procedure_name_snapshot: string;
        description_snapshot?: string;
        unit_price: number;
        sessions: number;
        total_price: number;
        allows_sessions: boolean;
    }[];
    payment_methods: {
        method: 'pix' | 'credit_card' | 'boleto' | 'cash';
        amount: number;
        installments?: number;
        card_fee_percent?: number;
    }[];
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ initialData, onSave, onCancel }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Computed totals
    const [subtotal, setSubtotal] = useState(0);
    const [totalWithFee, setTotalWithFee] = useState(0);
    const [remainingBalance, setRemainingBalance] = useState(0);

    const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BudgetFormData>({
        defaultValues: {
            patient_id: initialData?.patient_id || '',
            status: initialData?.status || 'draft',
            payment_method: initialData?.payment_method || 'pix',
            installments: initialData?.installments || 1,
            card_fee_percent: initialData?.card_fee_percent || 0,
            valid_until: initialData?.valid_until || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days default
            items: initialData?.items?.map(i => ({
                procedure_id: i.procedure_id || '',
                procedure_name_snapshot: i.procedure_name_snapshot,
                description_snapshot: i.description_snapshot,
                unit_price: i.unit_price,
                sessions: i.sessions,
                total_price: i.total_price,
                allows_sessions: true // We'll update this when loading procedures, default true to avoid hiding
            })) || [],
            payment_methods: initialData?.payment_methods || []
        }
    });

    const { fields: itemFields, append: appendItem, remove: removeItem, update: updateItem } = useFieldArray({
        control,
        name: "items"
    });

    const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({
        control,
        name: "payment_methods"
    });

    const watchedItems = watch('items');
    const watchedPaymentMethods = watch('payment_methods');

    useEffect(() => {
        loadData();
    }, []);

    // Update calculations when dependencies change
    useEffect(() => {
        calculateTotals();
    }, [watchedItems, watchedPaymentMethods]);

    const loadData = async () => {
        try {
            const [patientsData, proceduresData] = await Promise.all([
                supabaseService.getPatients(),
                supabaseService.getProcedures(true) // Active only
            ]);
            setPatients(patientsData);
            setProcedures(proceduresData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading form data:', error);
            toast.error('Erro ao carregar dados do formulário');
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const sub = watchedItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0);
        setSubtotal(sub);

        let totalFee = 0;
        const totalPayments = watchedPaymentMethods.reduce((acc, pm) => {
            if (pm.method === 'credit_card' && (pm.card_fee_percent || 0) > 0) {
                totalFee += (pm.amount || 0) * ((pm.card_fee_percent || 0) / 100);
            }
            return acc + (Number(pm.amount) || 0);
        }, 0);

        const currentTotal = sub + totalFee;
        setTotalWithFee(currentTotal);
        setRemainingBalance(Math.max(0, currentTotal - totalPayments));
    };

    const onProcedureSelect = (index: number, procedureId: string) => {
        const procedure = procedures.find(p => p.id === procedureId);
        if (!procedure) return;

        const unitPrice = procedure.price || 0;
        const sessions = 1;

        updateItem(index, {
            procedure_id: procedure.id,
            procedure_name_snapshot: procedure.name,
            description_snapshot: procedure.budget_description,
            unit_price: unitPrice,
            sessions: sessions,
            total_price: unitPrice * sessions,
            allows_sessions: procedure.allows_sessions || false
        });
    };

    const onUnitPriceChange = (index: number, price: number) => {
        const item = watchedItems[index];
        if (!item) return;
        const safePrice = Math.max(0, price);
        updateItem(index, {
            ...item,
            unit_price: safePrice,
            total_price: safePrice * (item.sessions || 1)
        });
    };

    const onSessionsChange = (index: number, sessions: number) => {
        const item = watchedItems[index];
        if (!item) return;

        // Ensure sessions is at least 1
        const safeSessions = Math.max(1, sessions);

        updateItem(index, {
            ...item,
            sessions: safeSessions,
            total_price: item.unit_price * safeSessions
        });
    };

    const onSubmit = async (data: BudgetFormData) => {
        if (data.items.length === 0) {
            toast.error('Adicione pelo menos um procedimento ao orçamento.');
            return;
        }

        if (data.payment_methods.length > 0) {
            const totalPayments = data.payment_methods.reduce((acc, pm) => acc + (Number(pm.amount) || 0), 0);
            if (Math.abs(totalPayments - totalWithFee) > 0.05) {
                toast.error(`A soma dos pagamentos (R$ ${totalPayments.toFixed(2)}) deve ser igual ao total (R$ ${totalWithFee.toFixed(2)}).`);
                return;
            }
        }

        setSaving(true);
        try {
            const budgetPayload = {
                patient_id: data.patient_id,
                status: data.status,
                // Legacy fields (kept for compatibility or set to first method)
                payment_method: data.payment_methods[0]?.method || 'pix',
                installments: data.payment_methods[0]?.installments || 1,
                card_fee_percent: data.payment_methods[0]?.card_fee_percent || 0,

                subtotal: subtotal,
                total_with_fee: totalWithFee,
                valid_until: data.valid_until,
                payment_methods: data.payment_methods // New JSONB field
            };

            const itemsPayload = data.items.map(item => ({
                procedure_id: item.procedure_id || null,
                procedure_name_snapshot: item.procedure_name_snapshot,
                description_snapshot: item.description_snapshot,
                unit_price: item.unit_price,
                sessions: item.sessions,
                total_price: item.total_price
            }));

            if (initialData?.id) {
                await supabaseService.updateBudget(initialData.id, budgetPayload, itemsPayload);
                toast.success('Orçamento atualizado com sucesso!');
            } else {
                await supabaseService.createBudget(budgetPayload, itemsPayload);
                toast.success('Orçamento criado com sucesso!');
            }
            onSave();
        } catch (error) {
            console.error('Error saving budget:', error);
            toast.error('Erro ao salvar orçamento.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando dados...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {initialData ? 'Editar Orçamento' : 'Novo Orçamento'}
                </h2>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* Helper to debug */}
                {/* <pre>{JSON.stringify(watchedItems, null, 2)}</pre> */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente</label>
                        <Controller
                            control={control}
                            name="patient_id"
                            rules={{ required: 'Selecione um paciente' }}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                                >
                                    <option value="">Selecione...</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.patient_id && <p className="text-red-500 text-xs mt-1">{errors.patient_id.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validade</label>
                        <input
                            type="date"
                            {...register('valid_until', { required: true })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select
                            {...register('status')}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                        >
                            <option value="draft">Rascunho</option>
                            <option value="sent">Enviado</option>
                            <option value="approved">Aprovado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                </div>

                {/* --- Procedimentos --- */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Procedimentos</h3>
                        <button
                            type="button"
                            onClick={() => appendItem({
                                procedure_id: '',
                                procedure_name_snapshot: '',
                                unit_price: 0,
                                sessions: 1,
                                total_price: 0,
                                allows_sessions: false,
                                description_snapshot: ''
                            })}
                            className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Adicionar Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {itemFields.map((field, index) => (
                            <div key={field.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-5">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Procedimento</label>
                                        <select
                                            value={watchedItems[index]?.procedure_id || ''}
                                            onChange={(e) => onProcedureSelect(index, e.target.value)}
                                            className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                                            aria-label="Selecionar Procedimento"
                                            title="Selecionar Procedimento"
                                        >
                                            <option value="">Selecione...</option>
                                            {procedures
                                                .filter(p => {
                                                    // Prevent duplicate: hide procedures already selected in other rows
                                                    const selectedIds = watchedItems
                                                        .map((it, i) => i !== index ? it.procedure_id : null)
                                                        .filter(Boolean);
                                                    return !selectedIds.includes(p.id);
                                                })
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}{(p.price || 0) > 0 ? ` — R$ ${p.price?.toFixed(2)}` : ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor Unit.</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={watchedItems[index]?.unit_price || 0}
                                            onChange={(e) => onUnitPriceChange(index, parseFloat(e.target.value) || 0)}
                                            className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                                            aria-label="Valor Unitário"
                                            title="Valor Unitário"
                                            placeholder="0,00"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Sessões</label>
                                        {watchedItems[index]?.allows_sessions ? (
                                            <input
                                                type="number"
                                                min="1"
                                                value={watchedItems[index]?.sessions || 1}
                                                onChange={(e) => onSessionsChange(index, parseInt(e.target.value) || 1)}
                                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                                                aria-label="Número de Sessões"
                                                title="Número de Sessões"
                                            />
                                        ) : (
                                            <div className="w-full text-sm py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-400 italic text-center">
                                                N/A
                                            </div>
                                        )}
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Total Item</label>
                                        <div className="w-full text-sm py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(watchedItems[index]?.total_price || 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {itemFields.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500">
                                Nenhum procedimento adicionado.
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Totais e Pagamento --- */}
                <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 border border-primary/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pagamento</h3>
                        <button
                            type="button"
                            disabled={watchedItems.length === 0 || subtotal <= 0}
                            onClick={() => appendPayment({
                                method: 'pix',
                                amount: remainingBalance,
                                installments: 1,
                                card_fee_percent: 0
                            })}
                            className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={watchedItems.length === 0 ? 'Adicione procedimentos primeiro' : ''}
                        >
                            <span className="material-symbols-outlined text-sm">add_card</span>
                            Adicionar Pagamento
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {paymentFields.map((field, index) => (
                                <div key={field.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                                    <button
                                        type="button"
                                        onClick={() => removePayment(index)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Método</label>
                                            <select
                                                {...register(`payment_methods.${index}.method` as const)}
                                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                aria-label="Método de Pagamento"
                                                title="Método de Pagamento"
                                            >
                                                <option value="pix">PIX</option>
                                                <option value="credit_card">Cartão de Crédito</option>
                                                <option value="boleto">Boleto</option>
                                                <option value="cash">Dinheiro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register(`payment_methods.${index}.amount` as const, { valueAsNumber: true })}
                                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                placeholder="0,00"
                                                aria-label="Valor do Pagamento"
                                                title="Valor do Pagamento"
                                            />
                                        </div>
                                    </div>

                                    {watchedPaymentMethods[index]?.method === 'credit_card' && (
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs">
                                            <div>
                                                <label className="block text-gray-500 mb-1">Parcelas</label>
                                                <select
                                                    {...register(`payment_methods.${index}.installments` as const, { valueAsNumber: true })}
                                                    className="w-full rounded border-gray-200 dark:border-gray-600 text-xs py-1"
                                                    aria-label="Número de Parcelas"
                                                    title="Número de Parcelas"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                                                        <option key={n} value={n}>{n}x</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-gray-500 mb-1">Taxa (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    {...register(`payment_methods.${index}.card_fee_percent` as const, { valueAsNumber: true })}
                                                    className="w-full rounded border-gray-200 dark:border-gray-600 text-xs py-1"
                                                    placeholder="0"
                                                    aria-label="Taxa do Cartão (%)"
                                                    title="Taxa do Cartão (%)"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {paymentFields.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm italic">
                                    Nenhum pagamento adicionado.
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3 h-fit">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Subtotal (Procedimentos):</span>
                                <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                            </div>

                            {watchedPaymentMethods.map((pm, idx) => {
                                if (pm.method === 'credit_card' && (pm.card_fee_percent || 0) > 0) {
                                    const feeVal = (pm.amount || 0) * ((pm.card_fee_percent || 0) / 100);
                                    return (
                                        <div key={idx} className="flex justify-between text-xs text-red-500">
                                            <span>Taxa Maq. ({pm.card_fee_percent}%):</span>
                                            <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(feeVal)}</span>
                                        </div>
                                    );
                                }
                                return null;
                            })}

                            <div className="h-px bg-gray-200 dark:bg-gray-600 my-2"></div>

                            <div className="flex justify-between text-lg font-bold text-primary">
                                <span>Total Final (com taxas):</span>
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWithFee)}</span>
                            </div>

                            {remainingBalance > 0.01 && watchedPaymentMethods.length > 0 && (
                                <div className="flex justify-between text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                    <span>⚠ Restante a distribuir:</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingBalance)}</span>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs text-center text-gray-500 mb-2">Resumo dos Pagamentos</p>
                                {watchedPaymentMethods.map((pm, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span className="capitalize">{pm.method === 'credit_card' ? `${pm.installments}x Cartão` : pm.method}:</span>
                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pm.amount || 0)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-end mt-8">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Salvar Orçamento
                    </button>
                </div>
            </form>
        </div>
    );
};
