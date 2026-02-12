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
                <div className="flex justify-between items-start mb-12 border-b border-gray-200 pb-8">
                    <div className="flex items-center gap-4">
                        {/* Logo Placeholder - In a real app this would be a real logo URL */}
                        <div className="w-24 h-24 flex items-center justify-center">
                            {budget.clinic?.logo_url ? (
                                <img
                                    src={budget.clinic.logo_url}
                                    alt={budget.clinic.fantasy_name || 'Logo da Clínica'}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('bg-primary/10', 'rounded-xl');
                                        e.currentTarget.parentElement!.innerHTML = '<span class="material-symbols-outlined text-3xl text-primary">spa</span>';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-primary/10 rounded-xl flex items-center justify-center text-primary">
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
                                <th className="py-2 pl-2">Descrição</th>
                                <th className="py-2 text-center">Sessões</th>
                                <th className="py-2 text-right">Valor Unit.</th>
                                <th className="py-2 text-right pr-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {budget.items?.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-3 pl-2">
                                        <p className="font-bold text-gray-900">{item.procedure_name_snapshot}</p>
                                        {item.description_snapshot && (
                                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{item.description_snapshot}</p>
                                        )}
                                    </td>
                                    <td className="py-3 text-center">{item.sessions}</td>
                                    <td className="py-3 text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price)}
                                    </td>
                                    <td className="py-3 text-right font-medium pr-2">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-200">
                                <td colSpan={3} className="pt-4 text-right font-bold text-gray-900">Subtotal:</td>
                                <td className="pt-4 text-right font-bold text-gray-900 pr-2">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.subtotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Payment & Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-2/3 bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Detalhes do Pagamento</h3>

                        <div className="space-y-3 text-sm">
                            {budget.payment_methods && budget.payment_methods.length > 0 ? (
                                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                                    {budget.payment_methods.map((pm, idx) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-gray-900 capitalize">
                                                    {pm.method === 'credit_card' ? 'Cartão de Crédito' : pm.method === 'cash' ? 'Dinheiro' : pm.method === 'boleto' ? 'Boleto' : 'PIX'}
                                                </div>
                                                {pm.method === 'credit_card' && pm.installments && (
                                                    <div className="text-xs text-gray-500">
                                                        {pm.installments}x
                                                        {(pm.card_fee_percent || 0) > 0 && ` (+${pm.card_fee_percent}%)`}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="font-medium text-gray-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pm.amount || 0)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Fallback for legacy data
                                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Forma de Pagamento:</span>
                                        <span className="font-medium text-gray-900 capitalize">
                                            {budget.payment_method === 'credit_card' ? 'Cartão de Crédito' : budget.payment_method}
                                        </span>
                                    </div>
                                    {budget.payment_method === 'credit_card' && budget.installments && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Parcelamento:</span>
                                            <span>{budget.installments}x</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                                <span className="text-xl font-bold text-primary">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total_with_fee)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Legal */}
                <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-8 mt-auto">
                    <p className="mb-2">Este orçamento tem validade até a data estipulada. Após este período, os valores podem sofrer alterações.</p>
                    <p>
                        {budget.clinic?.fantasy_name || budget.clinic?.business_name || 'Aesthetic Clinic'}
                        {budget.clinic?.cnpj ? ` - CNPJ: ${budget.clinic.cnpj}` : ''}
                        {budget.clinic?.address ? ` - ${budget.clinic.address}` : ''}
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
