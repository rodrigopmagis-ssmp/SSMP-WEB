import { ConfigKanbanBloco } from '../types';

/**
 * Configuração completa do Kanban CRM Premium
 * 4 Blocos estratégicos + Bloco de Perdas
 */
export const KANBAN_CONFIG: ConfigKanbanBloco[] = [
    {
        id: 'captacao',
        label: 'Captação',
        cor: '#2563eb',
        colunas: [
            { id: 'novo_lead', label: 'Novo Lead', slaMinutos: 5 },
            { id: 'contato_automatico_enviado', label: 'Contato Automático Enviado', slaMinutos: 30 },
            { id: 'aguardando_resposta', label: 'Aguardando Resposta', slaMinutos: 60 },
            { id: 'tentativa_2', label: 'Tentativa 2', slaMinutos: 1440 },
            { id: 'lead_frio', label: 'Lead Frio' },
        ],
    },
    {
        id: 'qualificacao',
        label: 'Qualificação',
        cor: '#d97706',
        colunas: [
            { id: 'respondido', label: 'Respondido' },
            { id: 'em_diagnostico', label: 'Em Diagnóstico' },
            { id: 'perfil_aprovado', label: 'Perfil Aprovado' },
            { id: 'proposta_enviada', label: 'Proposta Enviada' },
            { id: 'aguardando_decisao', label: 'Aguardando Decisão' },
        ],
    },
    {
        id: 'conversao',
        label: 'Conversão & Agenda',
        cor: '#059669',
        colunas: [
            { id: 'avaliacao_agendada', label: 'Avaliação Agendada' },
            { id: 'avaliacao_confirmada', label: 'Avaliação Confirmada' },
            { id: 'compareceu', label: 'Compareceu' },
            { id: 'fechamento_realizado', label: 'Fechamento Realizado' },
            { id: 'procedimento_executado', label: 'Procedimento Executado' },
        ],
    },
    {
        id: 'pos_venda',
        label: 'Pós-Venda & Fidelização',
        cor: '#9a4c5f',
        colunas: [
            { id: 'pos_48h', label: 'Pós 48h', slaMinutos: 2880 },
            { id: 'acompanhamento_30d', label: 'Acompanhamento 30 dias' },
            { id: 'upsell', label: 'Upsell' },
            { id: 'cliente_vip', label: 'Cliente VIP' },
            { id: 'solicitar_indicacao', label: 'Solicitar Indicação' },
        ],
    },
    {
        id: 'perda',
        label: 'Perdas',
        cor: '#dc2626',
        colunas: [
            { id: 'nao_respondeu', label: 'Não Respondeu' },
            { id: 'sem_perfil_financeiro', label: 'Sem Perfil Financeiro' },
            { id: 'perdeu_concorrente', label: 'Perdeu para Concorrente' },
            { id: 'cancelou_avaliacao', label: 'Cancelou Avaliação' },
            { id: 'no_show', label: 'No-Show' },
        ],
    },
];

/** Blocos ativos do pipeline (sem perdas) */
export const BLOCOS_ATIVOS = KANBAN_CONFIG.filter(b => b.id !== 'perda');

/** Lookup rápido: coluna → bloco */
export const COLUNA_TO_BLOCO = KANBAN_CONFIG.reduce<Record<string, string>>((acc, bloco) => {
    bloco.colunas.forEach(col => {
        acc[col.id] = bloco.id;
    });
    return acc;
}, {});

/** Lookup rápido: coluna → config */
export const COLUNA_CONFIG = KANBAN_CONFIG.reduce<
    Record<string, { label: string; slaMinutos?: number; cor: string }>
>((acc, bloco) => {
    bloco.colunas.forEach(col => {
        acc[col.id] = { label: col.label, slaMinutos: col.slaMinutos, cor: bloco.cor };
    });
    return acc;
}, {});

/** Score badge: cor por faixa */
export function getScoreCor(score: number): string {
    if (score >= 80) return '#059669'; // verde
    if (score >= 60) return '#d97706'; // âmbar
    if (score >= 40) return '#2563eb'; // azul
    return '#6b7280';                  // cinza
}

/** Label legível do motivo de perda */
export const MOTIVO_PERDA_LABELS: Record<string, string> = {
    nao_respondeu: 'Não Respondeu',
    sem_perfil_financeiro: 'Sem Perfil Financeiro',
    perdeu_concorrente: 'Perdeu para Concorrente',
    cancelou_avaliacao: 'Cancelou Avaliação',
    no_show: 'No-Show',
    bloqueou: 'Bloqueou',
    sem_interesse: 'Sem Interesse',
    objecao_preco: 'Objeção de Preço',
    objecao_tempo: 'Objeção de Tempo',
    concorrente: 'Concorrente',
    nao_pode_pagar: 'Não Pode Pagar',
};
