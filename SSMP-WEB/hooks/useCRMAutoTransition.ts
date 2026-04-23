import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Negocio, NegocioCRM, BlocoKanban, ColunaKanban } from '../types';
import toast from 'react-hot-toast';

const CAPTACAO_COLUNAS = new Set<string>([
    'novo_lead',
    'contato_automatico_enviado',
    'aguardando_resposta',
    'tentativa_2',
    'lead_frio',
]);

interface UseCRMAutoTransitionOptions {
    negocios: Negocio[];
    onMoverCard: (negocioId: string, coluna: ColunaKanban, bloco: BlocoKanban) => void;
}

/**
 * useCRMAutoTransition
 *
 * Escuta novas mensagens na tabela `messages` via Supabase Realtime.
 * Se o sender_type for 'lead' e o negócio associado estiver em qualquer
 * coluna de Captação, move automaticamente para Qualificação > respondido.
 */
export function useCRMAutoTransition({ negocios, onMoverCard }: UseCRMAutoTransitionOptions) {
    // Map: lead_id → negocio para lookup rápido
    const negociosRef = useRef<Negocio[]>(negocios);
    negociosRef.current = negocios;

    useEffect(() => {
        const channel = supabase
            .channel('crm_auto_transition_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                async (payload) => {
                    const msg = payload.new;
                    if (!msg || msg.sender_type !== 'lead') return;

                    // Encontrar o negócio associado ao lead_id da mensagem
                    const leadId = msg.lead_id as string | undefined;
                    if (!leadId) return;

                    const negocio = negociosRef.current.find(
                        n => n.id_lead === leadId || n.lead?.id === leadId
                    ) as NegocioCRM | undefined;

                    if (!negocio) return;

                    // Só move se ainda estiver em Captação
                    const colunaAtual = (negocio as NegocioCRM).coluna;
                    if (!colunaAtual || !CAPTACAO_COLUNAS.has(colunaAtual)) return;

                    // Mover para Qualificação > Respondido
                    try {
                        await onMoverCard(negocio.id, 'respondido', 'qualificacao');
                        toast.success(
                            `📩 ${negocio.lead?.name || 'Lead'} respondeu! Movido para Qualificação.`,
                            { duration: 5000 }
                        );
                    } catch (err) {
                        console.error('[CRMAutoTransition] Erro ao mover card:', err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [onMoverCard]);
}
