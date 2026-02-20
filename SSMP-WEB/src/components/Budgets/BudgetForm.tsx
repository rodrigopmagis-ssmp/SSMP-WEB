import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { Patient, Procedure, Budget } from '../../../types';
import { CurrencyInput } from '../ui/CurrencyInput';
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
        unit?: string;
        discount?: number;
        discount_percent?: number;
        total_price: number;
        allows_sessions: boolean;
    }[];
    payment_methods: {
        method: 'pix' | 'credit_card' | 'boleto' | 'cash';
        amount: number;
        installments?: number;
        card_fee_percent?: number;
        discount?: number;
        discount_percent?: number;
    }[];
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ initialData, onSave, onCancel }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Patient Search State
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const filteredPatients = useMemo(() => {
        if (!patientSearchTerm) return patients;
        return patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()));
    }, [patients, patientSearchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsPatientDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Set initial patient name if editing
    useEffect(() => {
        if (initialData?.patient_id && patients.length > 0) {
            const p = patients.find(p => p.id === initialData.patient_id);
            if (p) {
                setPatientSearchTerm(p.name);
            }
        }
    }, [initialData, patients]);

    // Computed totals
    const [subtotal, setSubtotal] = useState(0);
    const [totalWithFee, setTotalWithFee] = useState(0);
    const [remainingBalance, setRemainingBalance] = useState(0);

    // Confirmation Modal State
    const [showDiscountConfirm, setShowDiscountConfirm] = useState(false);
    const [pendingDiscount, setPendingDiscount] = useState<{ index: number, percent: number } | null>(null);

    // Validation Error Modal State
    const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

    const { control, register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<BudgetFormData>({
        defaultValues: {
            patient_id: initialData?.patient_id || '',
            status: initialData?.status || 'draft',
            payment_method: initialData?.payment_method || 'pix',
            installments: initialData?.installments || 1,
            card_fee_percent: initialData?.card_fee_percent || 0,
            valid_until: initialData?.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days default
            items: initialData?.items?.map(i => {
                const totalBase = (i.unit_price * i.sessions);

                // Robust calculation: If discount is missing but total_price is lower than base, calculate it.
                let currentDiscount = i.discount || 0;
                if (currentDiscount === 0 && i.total_price && i.total_price < totalBase) {
                    currentDiscount = totalBase - i.total_price;
                }

                return {
                    procedure_id: i.procedure_id || '',
                    procedure_name_snapshot: i.procedure_name_snapshot,
                    description_snapshot: i.description_snapshot,
                    unit_price: i.unit_price,
                    sessions: i.sessions,
                    unit: i.unit || 'sessions', // Default to 'sessions'
                    discount: currentDiscount,
                    discount_percent: totalBase > 0 ? (currentDiscount / totalBase) * 100 : 0,
                    total_price: i.total_price,
                    allows_sessions: true // We'll update this when loading procedures, default true to avoid hiding
                };
            }) || [],
            payment_methods: initialData?.payment_methods?.map(pm => ({
                ...pm,
                discount: pm.discount || 0,
                discount_percent: (pm.amount || 0) > 0 ? ((pm.discount || 0) / (pm.amount || 0)) * 100 : 0
            })) || []
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
        let totalPaymentDiscounts = 0;
        const totalPayments = watchedPaymentMethods.reduce((acc, pm) => {
            let paymentValue = Number(pm.amount) || 0;
            const discount = Number(pm.discount) || 0;
            totalPaymentDiscounts += discount;

            if (pm.method === 'credit_card' && (pm.card_fee_percent || 0) > 0) {
                // Fee is calculated on NET value (Amount - Discount)
                const netValue = Math.max(0, paymentValue - discount);
                const fee = netValue * ((pm.card_fee_percent || 0) / 100);
                totalFee += fee;
                // Add fee to the payment value for balancing purposes
                paymentValue += fee;
            }
            // Subtract discount to get the actual Net Payment Value contributing to the debt
            paymentValue -= discount;

            return acc + paymentValue;
        }, 0);

        const currentTotal = sub + totalFee - totalPaymentDiscounts;
        setTotalWithFee(currentTotal);
        // Use a small epsilon for floating point comparison if needed, but Math.max(0, ...) handles negative
        setRemainingBalance(Math.max(0, currentTotal - totalPayments));
    };

    const onProcedureSelect = (index: number, procedureId: string) => {
        const procedure = procedures.find(p => p.id === procedureId);
        if (!procedure) return;

        const unitPrice = procedure.price || 0;
        const sessions = 1;
        const discount = 0;
        let totalPrice = (unitPrice * sessions) - discount;
        if (totalPrice < 0) totalPrice = 0;

        updateItem(index, {
            procedure_id: procedure.id,
            procedure_name_snapshot: procedure.name,
            description_snapshot: procedure.budget_description,
            unit_price: unitPrice,
            sessions: sessions,
            unit: 'sessions', // Default unit
            discount: discount,
            discount_percent: 0,
            total_price: totalPrice,
            allows_sessions: procedure.allows_sessions || false
        });
    };

    const onUnitChange = (index: number, unit: string) => {
        const item = watchedItems[index];
        if (!item) return;

        updateItem(index, {
            ...item,
            unit: unit
        });
    };

    const onUnitPriceChange = (index: number, price: number) => {
        const item = watchedItems[index];
        if (!item) return;
        const safePrice = Math.max(0, price);

        const sessions = item.sessions || 1;
        const discountPercent = item.discount_percent || 0;

        const totalBase = safePrice * sessions;
        const discountValue = totalBase * (discountPercent / 100);
        const totalPrice = Math.max(0, totalBase - discountValue);

        setValue(`items.${index}.discount`, discountValue);
        setValue(`items.${index}.total_price`, totalPrice);
    };

    const onSessionsChange = (index: number, sessions: number) => {
        const item = watchedItems[index];
        if (!item) return;

        const safeSessions = Math.max(1, sessions);
        const unitPrice = item.unit_price || 0;
        const discountPercent = item.discount_percent || 0;

        const totalBase = unitPrice * safeSessions;
        const discountValue = totalBase * (discountPercent / 100);
        const totalPrice = Math.max(0, totalBase - discountValue);

        setValue(`items.${index}.discount`, discountValue);
        setValue(`items.${index}.total_price`, totalPrice);
    };

    const applyDiscount = (index: number, percent: number) => {
        const item = watchedItems[index];
        if (!item) return;

        const safePercent = Math.max(0, percent);
        const unitPrice = item.unit_price || 0;
        const sessions = item.sessions || 1;

        const totalBase = unitPrice * sessions;
        const discountValue = totalBase * (safePercent / 100);
        const totalPrice = Math.max(0, totalBase - discountValue);

        setValue(`items.${index}.discount`, discountValue);
        setValue(`items.${index}.total_price`, totalPrice);
    };

    const onDiscountChange = (index: number, percent: number) => {
        if (watchedPaymentMethods.length > 0) {
            setPendingDiscount({ index, percent });
            setShowDiscountConfirm(true);
        } else {
            applyDiscount(index, percent);
        }
    };

    const confirmDiscountChange = () => {
        if (!pendingDiscount) return;

        // Clear payment methods
        setValue('payment_methods', []);

        // Apply the pending discount
        applyDiscount(pendingDiscount.index, pendingDiscount.percent);

        // Reset state
        setShowDiscountConfirm(false);
        setPendingDiscount(null);
    };

    const onSubmit = async (data: BudgetFormData) => {
        if (data.items.length === 0) {
            toast.error('Adicione pelo menos um procedimento ao orçamento.');
            return;
        }

        // Calculate expected totals based on current data
        const subTotal = data.items.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0);
        const totalPaymentDiscounts = data.payment_methods.reduce((acc, pm) => acc + (Number(pm.discount) || 0), 0);

        let totalFees = 0;
        const totalPayments = data.payment_methods.reduce((acc, pm) => {
            let paymentValue = Number(pm.amount) || 0;
            const discount = Number(pm.discount) || 0;

            if (pm.method === 'credit_card' && (pm.card_fee_percent || 0) > 0) {
                // Fee is calculated on NET value (Amount - Discount)
                const netValue = Math.max(0, paymentValue - discount);
                const fee = netValue * ((Number(pm.card_fee_percent) || 0) / 100);
                totalFees += fee;
                paymentValue += fee;
            }
            // Subtract discount to get the actual Net Payment Value contributing to the debt
            paymentValue -= discount;

            return acc + paymentValue;
        }, 0);

        const expectedTotal = subTotal + totalFees - totalPaymentDiscounts;

        if (data.payment_methods.length > 0) {
            if (Math.abs(totalPayments - expectedTotal) > 0.05) {
                setErrorModal({
                    visible: true,
                    message: `A soma dos pagamentos (comp. taxas) (R$ ${totalPayments.toFixed(2)}) deve ser igual ao total (R$ ${expectedTotal.toFixed(2)}).`
                });
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

                subtotal: subTotal,
                total_with_fee: expectedTotal,
                valid_until: data.valid_until,
                payment_methods: data.payment_methods // New JSONB field
            };

            const itemsPayload = data.items.map(item => ({
                procedure_id: item.procedure_id || null,
                procedure_name_snapshot: item.procedure_name_snapshot,
                description_snapshot: item.description_snapshot,
                unit_price: item.unit_price,
                sessions: item.sessions,
                unit: item.unit,
                discount: item.discount,
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

            <form onSubmit={handleSubmit(onSubmit, (errors) => {
                console.error('Validation Errors:', errors);
                setErrorModal({
                    visible: true,
                    message: 'Verifique os campos obrigatórios destacados em vermelho.'
                });
            })} className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* Helper to debug */}
                {/* <pre>{JSON.stringify(watchedItems, null, 2)}</pre> */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="col-span-1">
                        <label htmlFor="patient_search_budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente</label>
                        <Controller
                            control={control}
                            name="patient_id"
                            rules={{ required: 'Selecione um paciente' }}
                            render={({ field }) => (
                                <div className="relative" ref={searchContainerRef}>
                                    <div className="relative">
                                        <input
                                            id="patient_search_budget"
                                            type="text"
                                            value={patientSearchTerm}
                                            onChange={(e) => {
                                                setPatientSearchTerm(e.target.value);
                                                setIsPatientDropdownOpen(true);
                                                if (e.target.value === '') {
                                                    field.onChange(''); // Clear form value
                                                }
                                            }}
                                            onFocus={() => setIsPatientDropdownOpen(true)}
                                            onClick={() => setIsPatientDropdownOpen(true)}
                                            placeholder="Digite para buscar paciente..."
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary pr-10"
                                            autoComplete="off"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400">search</span>
                                        </div>

                                        {/* Dropdown Results */}
                                        {isPatientDropdownOpen && (
                                            <ul className="absolute z-[70] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                                                {filteredPatients.length > 0 ? (
                                                    filteredPatients.map(p => (
                                                        <li
                                                            key={p.id}
                                                            className="text-gray-900 dark:text-white cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                                                            onClick={() => {
                                                                field.onChange(p.id); // Update form value
                                                                setPatientSearchTerm(p.name);
                                                                setIsPatientDropdownOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="font-medium block truncate">
                                                                    {p.name}
                                                                </span>
                                                            </div>
                                                            {field.value === p.id && (
                                                                <span className="text-primary absolute inset-y-0 right-0 flex items-center pr-4">
                                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-gray-500 dark:text-gray-400 cursor-default select-none py-2 pl-3 pr-9 text-center text-sm">
                                                        Nenhum paciente encontrado
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>
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
                                description_snapshot: '',
                                discount: 0
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

                                <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-2 items-end pr-0 md:pr-8">
                                    <div className="col-span-2 md:col-span-6">
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
                                                    // Filter by financial configuration
                                                    if (!p.use_in_budget) return false;

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

                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor Unit.</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                {...register(`items.${index}.unit_price`, {
                                                    valueAsNumber: true,
                                                    onChange: (e) => onUnitPriceChange(index, parseFloat(e.target.value) || 0)
                                                })}
                                                className="w-full text-sm pl-8 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary"
                                                aria-label="Valor Unitário"
                                                title="Valor Unitário"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-1 md:col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Qtd.</label>
                                        <input
                                            type="number"
                                            min="1"
                                            {...register(`items.${index}.sessions`, {
                                                valueAsNumber: true,
                                                onChange: (e) => onSessionsChange(index, parseInt(e.target.value) || 1)
                                            })}
                                            className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary px-2"
                                            aria-label="Quantidade"
                                            title="Quantidade"
                                        />
                                    </div>

                                    <div className="col-span-1 md:col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Desc. (%)</label>
                                        <div className="relative">
                                            {/* <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs text-[10px]">%</span> */}
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                {...register(`items.${index}.discount_percent`, {
                                                    valueAsNumber: true,
                                                    onChange: (e) => onDiscountChange(index, parseFloat(e.target.value) || 0)
                                                })}
                                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                                                aria-label="Desconto do Item (%)"
                                                title="Desconto do Item (%)"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Total Item</label>
                                        <div className="w-full text-sm py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(watchedItems[index]?.total_price || 0)}
                                        </div>
                                    </div>
                                </div>
                                {watchedItems[index]?.description_snapshot && (
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic text-justify">
                                        {watchedItems[index].description_snapshot}
                                    </div>
                                )}
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
                            onClick={() => {
                                const currentItems = getValues('items') || [];
                                const currentPayments = getValues('payment_methods') || [];

                                const sub = currentItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0);

                                // Sum of Gross Payments (ignoring discounts/fees for next payment suggestion)
                                const paymentsSum = currentPayments.reduce((acc, pm) => {
                                    return acc + (Number(pm.amount) || 0);
                                }, 0);

                                const balance = Math.max(0, sub - paymentsSum);

                                appendPayment({
                                    method: 'pix',
                                    amount: balance,
                                    installments: 1,
                                    card_fee_percent: 0,
                                    discount: 0,
                                    discount_percent: 0
                                });
                            }}
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

                                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 mb-3">
                                        <div className="col-span-1 md:col-span-3">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Método</label>
                                            <select
                                                {...register(`payment_methods.${index}.method` as const, {
                                                    onChange: () => {
                                                        // Reset fields when method changes
                                                        setValue(`payment_methods.${index}.discount`, 0);
                                                        setValue(`payment_methods.${index}.discount_percent`, 0);
                                                        setValue(`payment_methods.${index}.card_fee_percent`, 0);
                                                        setValue(`payment_methods.${index}.installments`, 1);
                                                    }
                                                })}
                                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                aria-label="Método de Pagamento"
                                                title="Método de Pagamento"
                                            >
                                                <option value="pix">PIX</option>
                                                <option value="credit_card">Cartão</option>
                                                <option value="boleto">Boleto</option>
                                                <option value="cash">Dinheiro</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1 md:col-span-3">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                                            <Controller
                                                control={control}
                                                name={`payment_methods.${index}.amount`}
                                                render={({ field }) => (
                                                    <CurrencyInput
                                                        value={field.value}
                                                        onChange={(val) => {
                                                            field.onChange(val);
                                                            const pm = watchedPaymentMethods[index];
                                                            const discountPercent = pm.discount_percent || 0;
                                                            const discountValue = val * (discountPercent / 100);
                                                            setValue(`payment_methods.${index}.discount`, discountValue);
                                                        }}
                                                        className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        placeholder="R$ 0,00"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Desc. (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                {...register(`payment_methods.${index}.discount_percent` as const, {
                                                    valueAsNumber: true,
                                                    onChange: (e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const pm = watchedPaymentMethods[index];
                                                        const amount = pm.amount || 0;
                                                        const discountValue = amount * (val / 100);
                                                        setValue(`payment_methods.${index}.discount`, discountValue);
                                                    }
                                                })}
                                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                                                placeholder="0"
                                                aria-label="Desconto do Pagamento (%)"
                                                title="Desconto do Pagamento (%)"
                                            />
                                        </div>
                                        {watchedPaymentMethods[index]?.method !== 'credit_card' && (
                                            <div className="col-span-1 md:col-span-4">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Valor c/ Desc.</label>
                                                <div className="w-full text-sm py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white h-[38px]">
                                                    {(() => {
                                                        const amount = watchedPaymentMethods[index]?.amount || 0;
                                                        const discount = watchedPaymentMethods[index]?.discount || 0;

                                                        // For non-credit card methods, there are no fees
                                                        const finalValue = Math.max(0, amount - discount);

                                                        if (discount > 0) {
                                                            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalValue);
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
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
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
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

                                    {/* Discount and Fee Values Display */}
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        {/* Value with Discount - Only for Credit Card */}
                                        {watchedPaymentMethods[index]?.method === 'credit_card' && (watchedPaymentMethods[index]?.discount || 0) > 0 && (
                                            <div className="col-span-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Valor com Desconto</label>
                                                <div className="w-full text-sm py-2 px-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 font-bold text-red-600 dark:text-red-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        Math.max(0, (watchedPaymentMethods[index]?.amount || 0) - (watchedPaymentMethods[index]?.discount || 0))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Value with Fee - Only for Credit Card */}
                                        {watchedPaymentMethods[index]?.method === 'credit_card' && (watchedPaymentMethods[index]?.card_fee_percent || 0) > 0 && (
                                            <div className="col-span-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Valor com Taxa</label>
                                                <div className="w-full text-sm py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 font-bold text-amber-600 dark:text-amber-500">
                                                    {(() => {
                                                        const amount = watchedPaymentMethods[index]?.amount || 0;
                                                        const discount = watchedPaymentMethods[index]?.discount || 0;
                                                        const netValue = Math.max(0, amount - discount);
                                                        const fee = netValue * ((watchedPaymentMethods[index]?.card_fee_percent || 0) / 100);
                                                        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount + fee);
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {paymentFields.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm italic">
                                    Nenhum pagamento adicionado.
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3 h-fit">
                            {/* Calculate Totals for Display */}
                            {(() => {
                                const grossTotal = watchedItems.reduce((acc, item) => acc + ((item.unit_price || 0) * (item.sessions || 1)), 0);
                                const totalItemDiscounts = watchedItems.reduce((acc, item) => acc + (item.discount || 0), 0);
                                const totalPaymentDiscounts = watchedPaymentMethods.reduce((acc, pm) => acc + (pm.discount || 0), 0);
                                const totalFees = watchedPaymentMethods.reduce((acc, pm) => {
                                    if (pm.method === 'credit_card' && (pm.card_fee_percent || 0) > 0) {
                                        const amount = pm.amount || 0;
                                        const discount = pm.discount || 0;
                                        const netValue = Math.max(0, amount - discount);
                                        return acc + (netValue * ((pm.card_fee_percent || 0) / 100));
                                    }
                                    return acc;
                                }, 0);
                                const finalTotal = grossTotal - totalItemDiscounts - totalPaymentDiscounts + totalFees;

                                const totalPaidWithFees = watchedPaymentMethods.reduce((acc, pm) => {
                                    let paymentValue = (pm.amount || 0);
                                    if (pm.method === 'credit_card' && (pm.card_fee_percent || 0) > 0) {
                                        const amount = pm.amount || 0;
                                        const discount = pm.discount || 0;
                                        const netValue = Math.max(0, amount - discount);
                                        paymentValue += netValue * ((pm.card_fee_percent || 0) / 100);
                                    }

                                    // Subtract discount
                                    const discount = pm.discount || 0;
                                    paymentValue -= discount;

                                    return acc + paymentValue;
                                }, 0);

                                const remaining = Math.max(0, finalTotal - totalPaidWithFees);

                                return (
                                    <>
                                        <div className="space-y-2">
                                            {/* 1. Total Geral (Gross) */}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Total Geral:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grossTotal)}
                                                </span>
                                            </div>

                                            {/* 2. Descontos (Itens) */}
                                            {totalItemDiscounts > 0 && (
                                                <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                                                    <span>(-) Desconto Itens:</span>
                                                    <span>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalItemDiscounts)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* 3. Descontos (Pagamento) */}
                                            {totalPaymentDiscounts > 0 && (
                                                <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                                                    <span>(-) Desconto Pagto:</span>
                                                    <span>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaymentDiscounts)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* 4. Acréscimos (Taxas) */}
                                            {totalFees > 0 && (
                                                <div className="flex justify-between text-sm text-amber-600 dark:text-amber-500">
                                                    <span>(+) Acréscimos (Taxas):</span>
                                                    <span>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFees)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-gray-200 dark:bg-gray-600 my-3"></div>

                                        {/* 5. Total Final */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">Total Final:</span>
                                            <span className="text-xl font-bold text-primary">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}
                                            </span>
                                        </div>

                                        {/* Remaining Balance */}
                                        <div className="text-right mt-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Restante a Pagar:</span>
                                            <span className={`ml-2 text-sm font-medium ${remaining > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)}
                                            </span>
                                        </div>

                                        {/* Warning if remaining balance */}
                                        {remaining > 0.01 && watchedPaymentMethods.length > 0 && (
                                            <div className="mt-3 flex justify-between text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800">
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">warning</span> Falta distribuir:</span>
                                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)}</span>
                                            </div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-xs text-center text-gray-500 mb-2 font-medium">Resumo dos Pagamentos</p>
                                            {watchedPaymentMethods.map((pm, idx) => {
                                                let finalAmount = Number(pm.amount) || 0;
                                                const discount = Number(pm.discount) || 0;
                                                let label: string = pm.method;

                                                if (pm.method === 'credit_card') {
                                                    // Add fee to total (based on Net Value)
                                                    if ((pm.card_fee_percent || 0) > 0) {
                                                        const netValue = Math.max(0, finalAmount - discount);
                                                        finalAmount += netValue * (pm.card_fee_percent / 100);
                                                    }

                                                    // Calculate installment value based on the final amount (Post-discount + Fee)
                                                    // Wait, finalAmount here is Gross + Fee. We need to subtract discount for distinct display? 
                                                    // No, "finalAmount" variable name implies the final transaction value.
                                                    // If we want consistency, this should be (Amount - Discount + Fee).
                                                    // Let's apply discount subtraction to finalAmount variable.
                                                    finalAmount -= discount;

                                                    const installmentValue = finalAmount / (pm.installments || 1);
                                                    label = `${pm.installments}x Cartão (R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(installmentValue)})`;
                                                } else {
                                                    // For Pix/Cash, just subtract discount
                                                    finalAmount -= discount;
                                                }

                                                return (
                                                    <div key={idx} className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        <span className="capitalize">{label}:</span>
                                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalAmount)}</span>
                                                    </div>
                                                );
                                            })}

                                            {/* Total Payments Line */}
                                            {watchedPaymentMethods.length > 0 && (
                                                <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 border-dashed">
                                                    <span>Total Pago:</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaidWithFees)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
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

            {/* Discount Confirmation Modal */}
            {showDiscountConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => {
                            setShowDiscountConfirm(false);
                            setPendingDiscount(null);
                        }}
                    />

                    {/* Dialog card */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                        {/* Warning icon */}
                        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400">warning</span>
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Alterar desconto?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Ao alterar o desconto após definir os pagamentos, <strong>todas as formas de pagamento serão removidas</strong> para garantir a consistência dos valores.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Deseja continuar?
                            </p>
                        </div>

                        <div className="flex gap-3 w-full mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDiscountConfirm(false);
                                    setPendingDiscount(null);
                                }}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDiscountChange}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 transition-all"
                            >
                                Sim, continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Error Modal */}
            {errorModal.visible && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setErrorModal({ visible: false, message: '' })}
                    />

                    {/* Dialog card */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                        {/* Error icon */}
                        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">error</span>
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Atenção aos valores</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed text-center">
                                {errorModal.message}
                            </p>
                        </div>

                        <div className="w-full mt-4">
                            <button
                                type="button"
                                onClick={() => setErrorModal({ visible: false, message: '' })}
                                className="w-full px-4 py-2.5 text-sm font-semibold bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl shadow-lg transition-all"
                            >
                                Entendi, vou corrigir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
