import React, { useState } from 'react';
import { useSalesAnalytics, SalesMetrics } from '../src/hooks/useSalesAnalytics';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, Funnel, FunnelChart as RechartsFunnelChart, LabelList, PieChart, Pie
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalesDashboardProps {
    clinicId: string;
    onClose?: () => void;
}

const COLORS = ['#9a4c5f', '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];

const SalesDashboard: React.FC<SalesDashboardProps> = ({ clinicId, onClose }) => {
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const { loading, data } = useSalesAnalytics(clinicId, dateRange);

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white font-sans p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b-4 border-zinc-800 pb-6">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter italic">Sales Command Center</h1>
                    <p className="text-zinc-500 font-mono text-sm">MONITORING UNIT // {clinicId ? clinicId.substring(0, 8) : '00000000'}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-900 border-2 border-zinc-800 p-1">
                        {[
                            { label: '30D', value: 30 },
                            { label: '15D', value: 15 },
                            { label: '7D', value: 7 },
                            { label: 'MTD', value: 'mtd' }
                        ].map(period => (
                            <button
                                key={period.label}
                                onClick={() => {
                                    if (period.value === 'mtd') {
                                        setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
                                    } else {
                                        setDateRange({ from: subDays(new Date(), period.value as number), to: new Date() });
                                    }
                                }}
                                className="px-4 py-1 text-xs font-bold hover:bg-zinc-800 transition-colors"
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="bg-white text-black px-6 py-2 font-black uppercase text-sm hover:bg-zinc-200 transition-all border-l-4 border-b-4 border-zinc-400 active:translate-y-1 active:border-0"
                    >
                        Sair
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-2xl font-black animate-pulse uppercase">Célula Analytics: Carregando Dados...</div>
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    {/* KPI Row */}
                    <KPICard title="Total Leads" value={data.totalLeads} subValue="+12% vs last period" />
                    <KPICard title="Revenue" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalRevenue)} />
                    <KPICard title="Conv. Rate" value={`${data.conversionRate.toFixed(1)}%`} />
                    <KPICard title="Avg SLA" value={`${Math.round(data.avgSlaMinutes)}m`} alert={data.avgSlaMinutes > 30} />

                    {/* Main Charts */}
                    <div className="md:col-span-2 bg-zinc-900 border-2 border-zinc-800 p-6 flex flex-col min-h-[400px]">
                        <h3 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-primary inline-block"></span>
                            Sales Funnel
                        </h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsFunnelChart>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '0' }} />
                                    <Funnel
                                        data={data.leadsByStage}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                                        {data.leadsByStage.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Funnel>
                                </RechartsFunnelChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-zinc-900 border-2 border-zinc-800 p-6 flex flex-col min-h-[400px]">
                        <h3 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-purple inline-block"></span>
                            Performance por Vendedor
                        </h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.salesPersonPerformance} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#52525b" fontSize={12} width={100} />
                                    <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: 'none' }} />
                                    <Bar dataKey="deals" name="Leads" fill="#9a4c5f" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Regional Insights */}
                    <div className="md:col-span-1 bg-zinc-900 border-2 border-zinc-800 p-6 flex flex-col h-[300px]">
                        <h3 className="text-md font-black uppercase mb-4">Regiões (São Paulo)</h3>
                        <div className="flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                {data.leadsByRegion.sort((a, b) => b.value - a.value).map((region, idx) => (
                                    <div key={region.name} className="flex flex-col">
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span>{region.name}</span>
                                            <span>{region.value}</span>
                                        </div>
                                        <div className="h-1 bg-zinc-800 w-full">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(region.value / Math.max(...data.leadsByRegion.map(r => r.value))) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-3 bg-zinc-800/10 border-2 border-zinc-800 p-6 border-dashed">
                        <div className="flex items-center justify-between h-full">
                            <div>
                                <h4 className="text-xl font-bold uppercase text-primary">Diagnóstico da Célula</h4>
                                <p className="text-zinc-500 max-w-md">O tempo médio de atendimento está {data.avgSlaMinutes > 30 ? 'acima' : 'dentro'} da meta. {data.conversionRate < 5 ? 'A taxa de conversão requer atenção na transição Qualificado -> Oferta.' : 'Bom desempenho na qualificação de leads.'}</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-12 h-12 border-2 border-zinc-700 flex items-center justify-center font-mono text-xs">A-1</div>
                                <div className="w-12 h-12 border-2 border-zinc-700 flex items-center justify-center font-mono text-xs">V-2</div>
                                <div className="w-12 h-12 border-2 border-zinc-700 flex items-center justify-center font-mono text-xs">X-9</div>
                            </div>
                        </div>
                    </div>

                </div>
            ) : null}

            <style>{`
        @keyframes blob {
          0% { transform: scale(1); }
          33% { transform: scale(1.1); }
          66% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite alternate;
        }
      `}</style>
        </div>
    );
};

const KPICard = ({ title, value, subValue, alert }: { title: string, value: string | number, subValue?: string, alert?: boolean }) => (
    <div className={`bg-zinc-900 border-2 ${alert ? 'border-red-600' : 'border-zinc-800'} p-6 flex flex-col justify-between hover:bg-zinc-800/50 transition-colors`}>
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{title}</span>
        <span className={`text-4xl font-black italic tracking-tighter ${alert ? 'text-red-500' : ''}`}>
            {value}
        </span>
        {subValue && (
            <span className="text-[10px] font-mono mt-4 text-emerald-500">
                {subValue}
            </span>
        )}
    </div>
);

export default SalesDashboard;
