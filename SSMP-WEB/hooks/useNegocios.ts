import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Negocio } from '../types';
import { negociosService } from '../src/services/negociosService';

export function useNegocios() {
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const carregarNegocios = async () => {
        try {
            setLoading(true);
            const data = await negociosService.getNegocios();
            setNegocios(data);
        } catch (err: any) {
            console.error('Erro ao carregar negócios:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const criarNegocio = async (negocioData: any) => {
        try {
            // Adaptando para usar o serviço existente ou fallback para insert direto se o objeto for complexo
            // O serviço criarNegocioDeLead espera idLead. Se o objeto passado tiver id_lead, usamos.
            if (negocioData.id_lead) {
                const novo = await negociosService.criarNegocioDeLead(
                    negocioData.id_lead,
                    negocioData.estagio || 'lead_quiz',
                    negocioData.id_vendedor,
                    negocioData.id_clinica,
                    negocioData.campaign_id,
                    negocioData.stage_id
                );
                setNegocios((prev) => [novo, ...prev]);
                return novo;
            } else {
                // Fallback para insert direto via supabase caso não se encaixe no serviço
                const { data, error } = await supabase
                    .from('negocios')
                    .insert(negocioData)
                    .select()
                    .single();

                if (error) throw error;
                setNegocios((prev) => [data, ...prev]);
                return data;
            }
        } catch (err: any) {
            console.error('Erro ao criar negócio:', err);
            throw err;
        }
    };

    const atualizarNegocio = async (id: string, updates: Partial<Negocio>) => {
        try {
            // Otimistic update
            setNegocios((prev) =>
                prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
            );

            let atualizado;

            // Se for atualização de estágio, usar o método específico do serviço para registrar atividade
            if (updates.estagio) {
                atualizado = await negociosService.atualizarEstagio(id, updates.estagio as any);
            } else {
                // Para outras atualizações genéricas, usar update direto por enquanto
                // Idealmente, adicionar método genérico no serviço
                const { data, error } = await supabase
                    .from('negocios')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                atualizado = data;
            }

            // Confirm update with server data
            setNegocios((prev) =>
                prev.map((n) => (n.id === id ? atualizado : n))
            );

            return atualizado;
        } catch (err: any) {
            console.error('Erro ao atualizar negócio:', err);
            // Revert optimism if needed (simple reload for now)
            carregarNegocios();
            throw err;
        }
    };

    useEffect(() => {
        carregarNegocios();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('negocios_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'negocios' },
                (payload) => {
                    // console.log('Realtime change:', payload);
                    carregarNegocios(); // Refresh list on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        negocios,
        loading,
        error,
        criarNegocio,
        atualizarNegocio,
        carregarNegocios
    };
}
