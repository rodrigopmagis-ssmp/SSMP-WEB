import { useState, useEffect, useMemo } from 'react';
import { negociosService } from '../services/negociosService';
import { Negocio, AtividadeNegocio, Estagio, Lead } from '../../types';
import { differenceInMinutes, parseISO, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';

export interface SalesMetrics {
    totalLeads: number;
    leadsInProgress: number;
    closedDeals: number;
    conversionRate: number;
    totalRevenue: number;
    avgSlaMinutes: number;
    leadsByStage: { name: string; value: number; color?: string }[];
    leadsBySource: { name: string; value: number }[];
    leadsByRegion: { name: string; value: number }[];
    salesPersonPerformance: { name: string; deals: number; revenue: number; avgSla: number }[];
    timelineData: { date: string; leads: number; revenue: number }[];
}

export function useSalesAnalytics(clinicId: string, dateRange: { from: Date; to: Date }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SalesMetrics | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAnalytics() {
            if (!clinicId) return;

            setLoading(true);
            try {
                // 1. Fetch all deals for the clinic
                // Note: For large datasets, we should filter by date in the query
                const allNegocios = await negociosService.getNegocios({});

                // 2. Filter by date range
                const filteredNegocios = allNegocios.filter(n => {
                    const createdAt = parseISO(n.criado_em);
                    return isWithinInterval(createdAt, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                });

                if (filteredNegocios.length === 0) {
                    setData(getEmptyMetrics());
                    setLoading(false);
                    return;
                }

                // 3. Fetch activities for SLA calculation
                const negocioIds = filteredNegocios.map(n => n.id);
                const activities = await negociosService.buscarAtividadesPorNegocios(negocioIds);

                // 4. Calculate Metrics
                const metrics = calculateMetrics(filteredNegocios, activities, dateRange);
                setData(metrics);
            } catch (err: any) {
                console.error('Error calculating sales analytics:', err);
                setError(err.message || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [clinicId, dateRange.from, dateRange.to]);

    return { loading, data, error };
}

function calculateMetrics(negocios: Negocio[], activities: AtividadeNegocio[], range: { from: Date; to: Date }): SalesMetrics {
    const revenue = negocios
        .filter(n => n.estagio === 'ganho')
        .reduce((acc, n) => acc + (n.valor_consulta || 0), 0);

    const closed = negocios.filter(n => n.estagio === 'ganho').length;
    const inProgress = negocios.filter(n => n.estagio !== 'ganho' && n.estagio !== 'perdido').length;

    // SLA Calculation: Time between "Negocio Created" and first "tentativa_contato"
    const slaData = negocios.map(n => {
        const firstContact = activities
            .filter(a => a.id_negocio === n.id && a.tipo_atividade === 'tentativa_contato')
            .sort((a, b) => parseISO(a.criado_em).getTime() - parseISO(b.criado_em).getTime())[0];

        if (firstContact) {
            return differenceInMinutes(parseISO(firstContact.criado_em), parseISO(n.criado_em));
        }
        return null;
    }).filter(v => v !== null) as number[];

    const avgSla = slaData.length > 0 ? slaData.reduce((a, b) => a + b, 0) / slaData.length : 0;

    // Leads by Stage (Funnel)
    const stageCounts: Record<string, number> = {};
    negocios.forEach(n => {
        const stage = n.estagio || 'Sem Estágio';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    // Regions (Question 9 mapping)
    const regionCounts: Record<string, number> = {};
    negocios.forEach(n => {
        const lead = n.lead;
        if (!lead) return;

        // Search for Question 9 in protocol_data
        // The key might be index based or name based
        const quizResponse = lead.protocol_data || {};
        let region = 'Outros';

        // Try common keys for "Região de São Paulo"
        if (quizResponse['vcmrsps'] || quizResponse['region'] || quizResponse['regiao']) {
            region = quizResponse['vcmrsps'] || quizResponse['region'] || quizResponse['regiao'];
        } else {
            // Fallback: check all values for SP regions if it's a string
            const allText = JSON.stringify(quizResponse);
            if (allText.includes('Zona Sul')) region = 'Zona Sul';
            else if (allText.includes('Zona Norte')) region = 'Zona Norte';
            else if (allText.includes('Zona Leste')) region = 'Zona Leste';
            else if (allText.includes('Zona Oeste')) region = 'Zona Oeste';
            else if (allText.includes('Centro')) region = 'Centro';
            else if (allText.includes('ABCD')) region = 'ABCD';
        }

        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    // Salesperson Performance
    const sellerPerformance: Record<string, any> = {};
    negocios.forEach(n => {
        const seller = n.nome_vendedor || 'Não Atribuído';
        if (!sellerPerformance[seller]) {
            sellerPerformance[seller] = { name: seller, deals: 0, revenue: 0, totalSla: 0, slaCount: 0 };
        }
        sellerPerformance[seller].deals++;
        if (n.estagio === 'ganho') {
            sellerPerformance[seller].revenue += n.valor_consulta || 0;
        }

        // Individual SLA for seller
        const firstContact = activities
            .filter(a => a.id_negocio === n.id && a.tipo_atividade === 'tentativa_contato')
        [0];
        if (firstContact) {
            sellerPerformance[seller].totalSla += differenceInMinutes(parseISO(firstContact.criado_em), parseISO(n.criado_em));
            sellerPerformance[seller].slaCount++;
        }
    });

    return {
        totalLeads: negocios.length,
        leadsInProgress: inProgress,
        closedDeals: closed,
        conversionRate: (closed / negocios.length) * 100,
        totalRevenue: revenue,
        avgSlaMinutes: avgSla,
        leadsByStage: Object.entries(stageCounts).map(([name, value]) => ({ name, value })),
        leadsBySource: [], // To be implemented with Campaign data
        leadsByRegion: Object.entries(regionCounts).map(([name, value]) => ({ name, value })),
        salesPersonPerformance: Object.values(sellerPerformance).map(s => ({
            name: s.name,
            deals: s.deals,
            revenue: s.revenue,
            avgSla: s.slaCount > 0 ? s.totalSla / s.slaCount : 0
        })),
        timelineData: [] // To be implemented with date grouping
    };
}

function getEmptyMetrics(): SalesMetrics {
    return {
        totalLeads: 0,
        leadsInProgress: 0,
        closedDeals: 0,
        conversionRate: 0,
        totalRevenue: 0,
        avgSlaMinutes: 0,
        leadsByStage: [],
        leadsBySource: [],
        leadsByRegion: [],
        salesPersonPerformance: [],
        timelineData: []
    };
}
