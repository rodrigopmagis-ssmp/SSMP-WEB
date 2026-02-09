import { Negocio } from '../types';

/**
 * Regras de SLA por urgência (em minutos)
 */
export const SLA_LIMITS = {
    alta: 5,      // Ultra Quente - 5 minutos
    média: 30,    // Quente - 30 minutos
    baixa: 120,   // Morno - 2 horas
    null: 240     // Sem urgência - 4 horas
} as const;

/**
 * Calcular tempo decorrido desde criação ou último contato (em minutos)
 */
export function getTimeInStage(negocio: Negocio): number {
    const now = new Date();
    const baseTime = negocio.ultimo_contato_em || negocio.criado_em;
    const diffMs = now.getTime() - new Date(baseTime).getTime();
    return Math.floor(diffMs / (1000 * 60)); // Retorna minutos
}

/**
 * Verificar se SLA foi violado
 */
export function isSLAViolated(negocio: Negocio): boolean {
    // Não aplicar SLA para negócios ganhos ou perdidos
    if (negocio.estagio === 'ganho' || negocio.estagio === 'perdido' || negocio.estagio === 'consulta_realizada') {
        return false;
    }

    const timeInMinutes = getTimeInStage(negocio);
    const urgency = negocio.lead?.ai_urgency || null;
    const slaLimit = SLA_LIMITS[urgency as keyof typeof SLA_LIMITS] || SLA_LIMITS.null;

    return timeInMinutes > slaLimit;
}

/**
 * Obter nível de urgência do SLA
 */
export function getSLAUrgencyLevel(negocio: Negocio): 'critical' | 'warning' | 'normal' {
    // Não aplicar SLA para negócios ganhos ou perdidos
    if (negocio.estagio === 'ganho' || negocio.estagio === 'perdido' || negocio.estagio === 'consulta_realizada') {
        return 'normal';
    }

    const timeInMinutes = getTimeInStage(negocio);
    const urgency = negocio.lead?.ai_urgency || null;
    const slaLimit = SLA_LIMITS[urgency as keyof typeof SLA_LIMITS] || SLA_LIMITS.null;

    if (timeInMinutes > slaLimit) return 'critical';
    if (timeInMinutes > (slaLimit * 0.8)) return 'warning'; // 80% do limite
    return 'normal';
}

/**
 * Formatar tempo restante até violação
 */
export function getTimeUntilViolation(negocio: Negocio): string {
    const timeInMinutes = getTimeInStage(negocio);
    const urgency = negocio.lead?.ai_urgency || null;
    const slaLimit = SLA_LIMITS[urgency as keyof typeof SLA_LIMITS] || SLA_LIMITS.null;
    const remaining = slaLimit - timeInMinutes;

    if (remaining <= 0) return 'Atrasado!';
    if (remaining < 60) return `${remaining}min restantes`;

    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return `${hours}h ${minutes}min`;
}

/**
 * Formatar tempo decorrido para exibição
 */
export function formatTimeInStage(negocio: Negocio): string {
    const minutes = getTimeInStage(negocio);

    if (minutes < 60) return `${minutes}min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
