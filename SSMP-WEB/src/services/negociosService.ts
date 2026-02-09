import { supabase } from '../lib/supabase';
import { Negocio, AtividadeNegocio, FiltrosNegocio, Estagio, MotivoPerda, TipoAtividade } from '../../types';

/**
 * NegociosService - Serviço de gestão do pipeline de vendas
 * Fase 1 (MVP): Operações manuais com rastreamento completo
 */
export const negociosService = {

    /**
     * Buscar negócios com filtros opcionais
     */
    async getNegocios(filters?: FiltrosNegocio): Promise<Negocio[]> {
        let query = supabase
            .from('negocios')
            .select(`
        *,
        leads (
          id,
          name,
          whatsapp,
          ai_score,
          ai_urgency,
          concerns,
          procedure_awareness
        ),
        profiles!negocios_id_vendedor_fkey (
          id,
          full_name
        )
      `)
            .order('criado_em', { ascending: false });

        // Aplicar filtros
        if (filters?.estagio) {
            query = query.eq('estagio', filters.estagio);
        }
        if (filters?.id_vendedor) {
            query = query.eq('id_vendedor', filters.id_vendedor);
        }
        if (filters?.dateFrom) {
            query = query.gte('criado_em', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('criado_em', filters.dateTo);
        }
        if (filters?.searchTerm) {
            query = query.or(`metadados->>searchable_name.ilike.%${filters.searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar negócios:', error);
            throw error;
        }

        return (data || []).map((negocio: any) => ({
            ...negocio,
            lead: negocio.leads,
            nome_vendedor: negocio.profiles?.full_name
        }));
    },

    /**
     * Criar negócio a partir de um lead
     */
    async criarNegocioDeLead(
        idLead: string,
        estagioInicial: Estagio = 'lead_quiz',
        idVendedor?: string,
        idClinica?: string
    ): Promise<Negocio> {
        const { data, error } = await supabase
            .from('negocios')
            .insert({
                id_lead: idLead,
                estagio: estagioInicial,
                id_vendedor: idVendedor,
                id_clinica: idClinica,
                entrou_pipeline_em: new Date().toISOString()
            })
            .select(`
        *,
        leads (
          id,
          name,
          whatsapp,
          ai_score,
          ai_urgency
        )
      `)
            .single();

        if (error) {
            console.error('Erro ao criar negócio:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(data.id, 'mudanca_estagio', `Negócio criado no estágio: ${estagioInicial}`);

        return {
            ...data,
            lead: data.leads
        };
    },

    /**
     * Atualizar estágio do negócio
     */
    async atualizarEstagio(
        idNegocio: string,
        novoEstagio: Estagio,
        subestagio?: string
    ): Promise<Negocio> {
        const { data, error } = await supabase
            .from('negocios')
            .update({
                estagio: novoEstagio,
                subestagio: subestagio
            })
            .eq('id', idNegocio)
            .select(`
        *,
        leads (
          id,
          name,
          whatsapp,
          ai_score,
          ai_urgency,
          concerns,
          procedure_awareness
        ),
        profiles!negocios_id_vendedor_fkey (
          id,
          full_name
        )
      `)
            .single();

        if (error) {
            console.error('Erro ao atualizar estágio:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(
            idNegocio,
            'mudanca_estagio',
            `Movido para: ${novoEstagio}${subestagio ? ` (${subestagio})` : ''}`
        );

        return {
            ...data,
            lead: data.leads,
            nome_vendedor: data.profiles?.full_name
        };
    },

    /**
     * Marcar negócio como perdido
     */
    async marcarComoPerdido(
        idNegocio: string,
        motivo: MotivoPerda,
        detalhes?: string
    ): Promise<Negocio> {
        const { data, error } = await supabase
            .from('negocios')
            .update({
                estagio: 'perdido',
                motivo_perda: motivo,
                detalhes_perda: detalhes,
                perdido_em: new Date().toISOString()
            })
            .eq('id', idNegocio)
            .select()
            .single();

        if (error) {
            console.error('Erro ao marcar como perdido:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(
            idNegocio,
            'perdido',
            `Negócio perdido - Motivo: ${motivo}${detalhes ? ` - ${detalhes}` : ''}`
        );

        return data;
    },

    /**
     * Registrar tentativa de contato
     */
    async registrarTentativaContato(idNegocio: string): Promise<Negocio> {
        // Buscar negócio atual
        const { data: negocioAtual, error: fetchError } = await supabase
            .from('negocios')
            .select('tentativas_contato')
            .eq('id', idNegocio)
            .single();

        if (fetchError) throw fetchError;

        const { data, error } = await supabase
            .from('negocios')
            .update({
                tentativas_contato: (negocioAtual.tentativas_contato || 0) + 1,
                ultimo_contato_em: new Date().toISOString()
            })
            .eq('id', idNegocio)
            .select()
            .single();

        if (error) {
            console.error('Erro ao registrar tentativa de contato:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(
            idNegocio,
            'tentativa_contato',
            `Tentativa de contato #${data.tentativas_contato}`
        );

        return data;
    },

    /**
     * Atualizar agendamento de consulta
     */
    async atualizarAgendamento(
        idNegocio: string,
        dataAgendamento: string,
        confirmado: boolean = false
    ): Promise<Negocio> {
        const { data, error } = await supabase
            .from('negocios')
            .update({
                data_agendamento: dataAgendamento,
                agendamento_confirmado: confirmado
            })
            .eq('id', idNegocio)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar agendamento:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(
            idNegocio,
            'agendado',
            `Consulta agendada para ${new Date(dataAgendamento).toLocaleString('pt-BR')}`
        );

        return data;
    },

    /**
     * Atualizar status de pagamento
     */
    async atualizarStatusPagamento(
        idNegocio: string,
        statusPagamento: string,
        idPagamento?: string,
        gateway?: string
    ): Promise<Negocio> {
        const updateData: any = {
            status_pagamento: statusPagamento
        };

        if (idPagamento) updateData.id_pagamento = idPagamento;
        if (gateway) updateData.gateway_pagamento = gateway;
        if (statusPagamento === 'pago') updateData.pago_em = new Date().toISOString();

        const { data, error } = await supabase
            .from('negocios')
            .update(updateData)
            .eq('id', idNegocio)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar status de pagamento:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(
            idNegocio,
            'atualizacao_pagamento',
            `Status de pagamento: ${statusPagamento}`
        );

        // Se pagamento confirmado, mover para próximo estágio
        if (statusPagamento === 'pago') {
            await this.atualizarEstagio(idNegocio, 'consulta_paga');
        }

        return data;
    },

    /**
     * Registrar atividade no negócio
     */
    async registrarAtividade(
        idNegocio: string,
        tipoAtividade: TipoAtividade,
        descricao: string,
        metadados?: any
    ): Promise<AtividadeNegocio> {
        // Obter ID do usuário atual (se disponível)
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('atividades_negocios')
            .insert({
                id_negocio: idNegocio,
                id_usuario: user?.id,
                tipo_atividade: tipoAtividade,
                descricao: descricao,
                metadados: metadados
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao registrar atividade:', error);
            throw error;
        }

        return data;
    },

    /**
     * Buscar atividades de um negócio
     */
    async buscarAtividades(idNegocio: string): Promise<AtividadeNegocio[]> {
        const { data, error } = await supabase
            .from('atividades_negocios')
            .select(`
        *,
        profiles (
          full_name
        )
      `)
            .eq('id_negocio', idNegocio)
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('Erro ao buscar atividades:', error);
            throw error;
        }

        return (data || []).map((atividade: any) => ({
            ...atividade,
            nome_usuario: atividade.profiles?.full_name
        }));
    },

    /**
     * Reativar negócio perdido
     */
    async reativarNegocio(idNegocio: string, novoEstagio: Estagio = 'em_atendimento'): Promise<Negocio> {
        const { data, error } = await supabase
            .from('negocios')
            .update({
                estagio: novoEstagio,
                motivo_perda: null,
                detalhes_perda: null,
                perdido_em: null
            })
            .eq('id', idNegocio)
            .select()
            .single();

        if (error) {
            console.error('Erro ao reativar negócio:', error);
            throw error;
        }

        // Registrar atividade
        await this.registrarAtividade(
            idNegocio,
            'reativado',
            `Negócio reativado e movido para: ${novoEstagio}`
        );

        return data;
    },

    /**
     * Excluir negócio
     */
    async excluirNegocio(idNegocio: string): Promise<void> {
        const { error } = await supabase
            .from('negocios')
            .delete()
            .eq('id', idNegocio);

        if (error) {
            console.error('Erro ao excluir negócio:', error);
            throw error;
        }
    }
};
