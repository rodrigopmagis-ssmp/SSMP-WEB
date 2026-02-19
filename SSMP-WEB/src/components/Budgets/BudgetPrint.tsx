import React, { useEffect, useState } from 'react';
import { Budget } from '../../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabaseService } from '../../services/supabaseService';

interface BudgetPrintProps {
    budgetId: string;
    onClose: () => void;
}

export const BudgetPrint: React.FC<BudgetPrintProps> = ({ budgetId, onClose }) => {
    const [budget, setBudget] = useState<Budget | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBudget();
    }, [budgetId]);

    const loadBudget = async () => {
        try {
            const data = await supabaseService.getBudgetById(budgetId);
            setBudget(data);
            setLoading(false);
            // Auto print after loading
            setTimeout(() => {
                window.print();
            }, 500);
        } catch (error) {
            console.error('Error loading budget for print:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando visualização...</div>;
    if (!budget) return <div className="p-8 text-center text-red-500">Orçamento não encontrado.</div>;

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
            {/* Toolbar - Hidden on print */}
            <div className="print-hidden fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg">
                <h2 className="font-bold">Visualização de Impressão</h2>
                <div className="flex gap-4">
                    <button onClick={() => window.print()} className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg font-medium">
                        Imprimir / Salvar PDF
                    </button>
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium">
                        Fechar
                    </button>
                </div>
            </div>

            {/* Print Content */}
            <div className="max-w-[210mm] mx-auto bg-white p-[20mm] pt-[30mm] min-h-screen text-gray-900 print:p-0 print:pt-0">

                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-4">
                        {/* Logo Placeholder - In a real app this would be a real logo URL */}
                        <div className="flex items-center justify-start max-w-[300px]">
                            {budget.clinic?.logo_url ? (
                                <img
                                    src={budget.clinic.logo_url}
                                    alt={budget.clinic.fantasy_name || 'Logo da Clínica'}

                                    className="max-h-[160px] w-auto object-contain bg-transparent mix-blend-multiply"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('bg-primary/10', 'rounded-xl', 'w-24', 'h-24', 'justify-center');
                                        e.currentTarget.parentElement!.innerHTML = '<span class="material-symbols-outlined text-3xl text-primary">spa</span>';
                                    }}
                                />
                            ) : (
                                <div className="w-24 h-24 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl">spa</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 uppercase">
                                {budget.clinic?.fantasy_name || budget.clinic?.business_name || 'Aesthetic Clinic'}
                            </h1>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Estética Avançada</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">PROPOSTA DE ORÇAMENTO</h2>
                        <p className="text-sm text-gray-500">#{budget.id.slice(0, 8).toUpperCase()}</p>
                        <div className="mt-4 text-sm text-gray-600">
                            <p>Data: {format(new Date(budget.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p>Validade: {budget.valid_until ? format(new Date(budget.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : '15 dias'}</p>
                        </div>
                    </div>
                </div>

                {/* Patient Info */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Dados do Paciente</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 text-xs uppercase mb-1">Nome Completo</p>
                            <p className="font-medium text-gray-900">{budget.patient?.name}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs uppercase mb-1">CPF</p>
                            <p className="font-medium text-gray-900">{budget.patient?.cpf || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs uppercase mb-1">Telefone</p>
                            <p className="font-medium text-gray-900">{budget.patient?.phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs uppercase mb-1">Email</p>
                            <p className="font-medium text-gray-900">{budget.patient?.email || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Procedures Table */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 bg-gray-100 p-2 rounded">Procedimentos Propostos</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-100 text-left text-gray-500">
                                <th className="py-2 pl-2 w-[40%]">Descrição</th>
                                <th className="py-2 text-center w-[10%]">Qtd.</th>
                                <th className="py-2 text-right w-[15%]">Valor Unit.</th>
                                <th className="py-2 text-right w-[15%]">Valor c/ Desc.</th>
                                <th className="py-2 text-right pr-2 w-[20%]">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {budget.items?.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {/* Main Row: Name and Values */}
                                    <tr className="border-b-0 border-gray-100">
                                        <td className="py-2 pl-2 font-bold text-gray-900">
                                            {item.procedure_name_snapshot}
                                        </td>
                                        <td className="py-2 text-center text-gray-900">{item.sessions}</td>
                                        <td className="py-2 text-right text-gray-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price)}
                                        </td>
                                        <td className="py-2 text-right text-gray-900 font-medium">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.total_price / (item.sessions || 1)))}
                                        </td>
                                        <td className="py-2 text-right font-bold pr-2 text-gray-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_price)}
                                        </td>
                                    </tr>
                                    {/* Description Row */}
                                    {item.description_snapshot && (
                                        <tr className="border-b border-gray-100">
                                            <td colSpan={5} className="pb-4 pl-2 text-sm text-gray-600 text-justify leading-relaxed">
                                                {item.description_snapshot}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-200">
                                <td colSpan={4} className="pt-4 text-right font-bold text-gray-900">Subtotal:</td>
                                <td className="pt-4 text-right font-bold text-gray-900 pr-2">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.subtotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Payment & Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-full md:w-2/3 bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Detalhes do Pagamento</h3>

                        <div className="space-y-4 text-sm">
                            {budget.payment_methods && budget.payment_methods.length > 0 ? (
                                <>
                                    {budget.payment_methods.map((pm, idx) => {
                                        // Calculate exact values for display
                                        const originalAmount = pm.amount || 0;
                                        const discount = pm.discount || 0;
                                        const feePercent = pm.card_fee_percent || 0;

                                        // Reconstruct the calculation flow
                                        const amountAfterDiscount = Math.max(0, originalAmount - discount);
                                        const feeValue = feePercent > 0 ? amountAfterDiscount * (feePercent / 100) : 0;
                                        const finalAmount = amountAfterDiscount + feeValue;
                                        const installmentValue = finalAmount / (pm.installments || 1);

                                        return (
                                            <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-gray-900 capitalize flex items-center gap-2">
                                                        {pm.method === 'credit_card' ? 'Cartão de Crédito' : pm.method === 'cash' ? 'Dinheiro' : pm.method === 'boleto' ? 'Boleto' : 'PIX'}
                                                        {pm.installments && pm.installments > 1 && (
                                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                                {pm.installments}x
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-bold text-gray-900 text-lg">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalAmount)}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-gray-500 space-y-1 pl-2 border-l-2 border-primary/20">
                                                    <div className="flex justify-between">
                                                        <span>Valor Original:</span>
                                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalAmount)}</span>
                                                    </div>

                                                    {discount > 0 && (
                                                        <div className="flex justify-between text-green-600 font-medium">
                                                            <span>Desconto aplic. ({(originalAmount > 0 ? (discount / originalAmount) * 100 : 0).toFixed(0)}%):</span>
                                                            <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount)}</span>
                                                        </div>
                                                    )}

                                                    {feeValue > 0 && (
                                                        <div className="flex justify-between text-orange-600 font-medium">
                                                            <span>Taxa Cartão ({feePercent}%):</span>
                                                            <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(feeValue)}</span>
                                                        </div>
                                                    )}

                                                    {pm.installments && pm.installments > 1 && (
                                                        <div className="flex justify-between pt-1 mt-1 border-t border-dashed border-gray-200 font-medium text-gray-700">
                                                            <span>Parcelas:</span>
                                                            <span>{pm.installments}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentValue)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200">
                                        <span className="text-lg font-bold text-gray-900">VALOR TOTAL FINAL:</span>
                                        <span className="text-2xl font-bold text-primary">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total_with_fee)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-500 py-4">
                                    Nenhuma forma de pagamento registrada.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer / Legal */}
                <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-8 mt-auto">
                    <p className="mb-2">Este orçamento tem validade até a data estipulada. Após este período, os valores podem sofrer alterações.</p>
                    <p>
                        {budget.clinic?.fantasy_name || budget.clinic?.business_name || 'Aesthetic Clinic'}
                        {budget.clinic?.cpf_cnpj ? ` - CNPJ: ${budget.clinic.cpf_cnpj}` : ''}
                        {budget.clinic?.street ? ` - ${budget.clinic.street}, ${budget.clinic.number || 'S/N'} ${budget.clinic.complement ? `(${budget.clinic.complement})` : ''} - ${budget.clinic.neighborhood} - ${budget.clinic.city}/${budget.clinic.state}` : ''}
                    </p>
                </div>

            </div>

            <style>{`
        @media print {
            .print-hidden {
                display: none !important;
            }
            body {
                background: white;
            }
            @page {
                margin: 0;
            }
        }
      `}</style>
        </div>
    );
};
