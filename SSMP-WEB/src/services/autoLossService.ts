import { supabase } from '../lib/supabase';
import { negociosService } from './negociosService';

const RULES = {
    DAYS_INACTIVE: 7,
    MIN_CONTACT_ATTEMPTS: 6
};

export const autoLossService = {
    /**
     * Identificar e processar negócios estagnados
     */
    async processarNegociosEstagnados() {
        console.log('🔄 Iniciando verificação de auto-loss...');

        // Data limite: 7 dias atrás
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RULES.DAYS_INACTIVE);

        // Buscar negócios candidatos a perda automática
        // Critérios:
        // 1. Não estão ganhos nem perdidos
        // 2. Têm 6 ou mais tentativas de contato
        // 3. Último contato (ou criação) foi há mais de 7 dias
        const { data: candidatos, error } = await supabase
            .from('negocios')
            .select('id, estagio, tentativas_contato, ultimo_contato_em, criado_em')
            .not('estagio', 'in', '("ganho","perdido","consulta_realizada","consulta_paga")')
            .gte('tentativas_contato', RULES.MIN_CONTACT_ATTEMPTS)
            .or(`ultimo_contato_em.lt.${cutoffDate.toISOString()},and(ultimo_contato_em.is.null,criado_em.lt.${cutoffDate.toISOString()})`);

        if (error) {
            console.error('❌ Erro ao buscar negócios para auto-loss:', error);
            return 0;
        }

        console.log(`🔎 Encontrados ${candidatos.length} negócios estagnados.`);

        let processados = 0;

        for (const negocio of candidatos) {
            try {
                await negociosService.marcarComoPerdido(
                    negocio.id,
                    'nao_respondeu', // Motivo: Não Respondeu
                    'Perdido automaticamente pelo sistema (Auto-Loss) por inatividade.'
                );
                processados++;
            } catch (err) {
                console.error(`❌ Falha ao processar auto-loss para negócio ${negocio.id}:`, err);
            }
        }

        if (processados > 0) {
            console.log(`✅ Auto-loss concluído: ${processados} negócios movidos para Perdido.`);
        }

        return processados;
    }
};
