import { supabase } from '../lib/supabase';
import { Deal, DealActivity, DealFilters, DealStage, LossReason, DealActivityType } from '../../types';

/**
 * DealsService - Serviço de gestão do pipeline de vendas (Negócios)
 * Fase 1 (MVP): Operações manuais com rastreamento completo
 */
export const dealsService = {

    /**
     * Buscar negócios com filtros opcionais
     */
    async getDeals(filters?: DealFilters): Promise<Deal[]> {
        let query = supabase
            .from('deals')
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
        profiles!deals_seller_id_fkey (
          id,
          full_name
        )
      `)
            .order('created_at', { ascending: false });

        // Aplicar filtros
        if (filters?.stage) {
            query = query.eq('stage', filters.stage);
        }
        if (filters?.sellerId) {
            query = query.eq('seller_id', filters.sellerId);
        }
        if (filters?.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }
        if (filters?.searchTerm) {
            query = query.or(`metadata->>searchable_name.ilike.%${filters.searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(mapDbToDeal);
    },

    /**
     * Buscar negócio por ID
     */
    async getDealById(dealId: string): Promise<Deal | null> {
        const { data, error } = await supabase
            .from('deals')
            .select(`
        *,
        leads (*),
        profiles!deals_seller_id_fkey (
          id,
          full_name
        )
      `)
            .eq('id', dealId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return mapDbToDeal(data);
    },

    /**
     * Criar negócio a partir de um lead
     */
    async createDeal(leadId: string, sellerId?: string): Promise<Deal> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Buscar informações do lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError) throw leadError;
        if (!lead) throw new Error('Lead não encontrado');

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const dbDeal = {
            lead_id: leadId,
            clinic_id: profile?.clinic_id,
            seller_id: sellerId || user.id,
            stage: 'em_atendimento' as DealStage,
            contact_attempts: 0,
            consultation_fee: 250.00,
            payment_status: 'pending',
            pre_sales_started: false,
            scheduled_confirmed: false,
            sla_alert_sent: false,
            auto_lost_applied: false,
            entered_pipeline_at: new Date().toISOString(),
            metadata: {
                searchable_name: lead.name.toLowerCase()
            }
        };

        const { data, error } = await supabase
            .from('deals')
            .insert([dbDeal])
            .select()
            .single();

        if (error) throw error;

        // Registrar atividade de criação
        await this.addActivity(data.id, 'stage_change', `Negócio criado e movido para "Em Atendimento"`);

        return mapDbToDeal(data);
    },

    /**
     * Criar negócio com parâmetros customizados
     */
    async createDealFromLead(
        leadId: string,
        consultationFee: number,
        initialStage: DealStage = 'lead_quiz',
        sellerId?: string
    ): Promise<Deal> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Buscar lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError) throw leadError;
        if (!lead) throw new Error('Lead não encontrado');

        // Obter clinic_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const dbDeal = {
            lead_id: leadId,
            clinic_id: profile?.clinic_id,
            seller_id: sellerId || user.id,
            stage: initialStage,
            contact_attempts: 0,
            consultation_fee: consultationFee,
            payment_status: 'pending',
            pre_sales_started: false,
            scheduled_confirmed: false,
            sla_alert_sent: false,
            auto_lost_applied: false,
            entered_pipeline_at: new Date().toISOString(),
            metadata: {
                searchable_name: lead.name.toLowerCase()
            }
        };

        const { data, error } = await supabase
            .from('deals')
            .insert([dbDeal])
            .select()
            .single();

        if (error) throw error;

        await this.addActivity(
            data.id,
            'stage_change',
            `Negócio criado em "${this.getStageLabel(initialStage)}"`
        );

        return mapDbToDeal(data);
    },

    /**
     * Atualizar etapa do negócio
     */
    async updateDealStage(
        dealId: string,
        newStage: DealStage,
        substatus?: string
    ): Promise<Deal> {
        const updates: any = {
            stage: newStage,
            substatus: substatus || null,
            updated_at: new Date().toISOString()
        };

        // Se movendo para "ganho" ou "consulta_realizada", marcar entered_pipeline_at
        if (newStage === 'ganho' && !substatus) {
            updates.entered_pipeline_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('deals')
            .update(updates)
            .eq('id', dealId)
            .select()
            .single();

        if (error) throw error;

        // Registrar atividade
        await this.addActivity(
            dealId,
            'stage_change',
            `Etapa alterada para "${this.getStageLabel(newStage)}"${substatus ? ` - ${substatus}` : ''}`
        );

        return mapDbToDeal(data);
    },

    /**
     * Adicionar tentativa de contato
     */
    async addContactAttempt(dealId: string, notes?: string): Promise<Deal> {
        // Buscar deal atual
        const { data: currentDeal, error: fetchError } = await supabase
            .from('deals')
            .select('contact_attempts')
            .eq('id', dealId)
            .single();

        if (fetchError) throw fetchError;

        const newAttempts = (currentDeal.contact_attempts || 0) + 1;

        const { data, error } = await supabase
            .from('deals')
            .update({
                contact_attempts: newAttempts,
                last_contact_at: new Date().toISOString()
            })
            .eq('id', dealId)
            .select()
            .single();

        if (error) throw error;

        // Registrar atividade
        await this.addActivity(
            dealId,
            'contact_attempt',
            `Tentativa de contato #${newAttempts}${notes ? `: ${notes}` : ''}`
        );

        return mapDbToDeal(data);
    },

    /**
     * Marcar negócio como perdido
     */
    async markDealAsLost(
        dealId: string,
        reason: LossReason,
        details?: string
    ): Promise<Deal> {
        const { data, error } = await supabase
            .from('deals')
            .update({
                stage: 'perdido',
                loss_reason: reason,
                loss_details: details,
                lost_at: new Date().toISOString()
            })
            .eq('id', dealId)
            .select()
            .single();

        if (error) throw error;

        // Registrar atividade
        await this.addActivity(
            dealId,
            'lost',
            `Negócio perdido - Motivo: ${this.getLossReasonLabel(reason)}${details ? ` (${details})` : ''}`
        );

        return mapDbToDeal(data);
    },

    /**
     * Reativar negócio perdido
     */
    async reactivateDeal(dealId: string, newStage: DealStage = 'em_atendimento'): Promise<Deal> {
        const { data, error } = await supabase
            .from('deals')
            .update({
                stage: newStage,
                loss_reason: null,
                loss_details: null,
                lost_at: null
            })
            .eq('id', dealId)
            .select()
            .single();

        if (error) throw error;

        await this.addActivity(dealId, 'reactivated', `Negócio reativado e movido para "${this.getStageLabel(newStage)}"`);

        return mapDbToDeal(data);
    },

    /**
     * Atualizar agendamento da consulta
     */
    async updateConsultationSchedule(
        dealId: string,
        scheduledDate: string,
        confirmed: boolean = false
    ): Promise<Deal> {
        const { data, error } = await supabase
            .from('deals')
            .update({
                scheduled_date: scheduledDate,
                scheduled_confirmed: confirmed
            })
            .eq('id', dealId)
            .select()
            .single();

        if (error) throw error;

        await this.addActivity(
            dealId,
            'scheduled',
            `Consulta agendada para ${new Date(scheduledDate).toLocaleString('pt-BR')}${confirmed ? ' (confirmada)' : ''}`
        );

        return mapDbToDeal(data);
    },

    /**
     * Atualizar status de pagamento
     */
    async updatePaymentStatus(
        dealId: string,
        status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded',
        paymentId?: string
    ): Promise<Deal> {
        const updates: any = {
            payment_status: status
        };

        if (paymentId) {
            updates.payment_id = paymentId;
        }

        if (status === 'paid') {
            updates.paid_at = new Date().toISOString();
            updates.stage = 'consulta_paga'; // Auto-mover para próxima etapa
        }

        const { data, error } = await supabase
            .from('deals')
            .update(updates)
            .eq('id', dealId)
            .select()
            .single();

        if (error) throw error;

        await this.addActivity(dealId, 'payment_update', `Status de pagamento: ${status}`);

        return mapDbToDeal(data);
    },

    /**
     * Adicionar nota ao negócio
     */
    async addNote(dealId: string, note: string): Promise<DealActivity> {
        return await this.addActivity(dealId, 'note', note);
    },

    /**
     * Buscar atividades de um negócio
     */
    async getDealActivities(dealId: string): Promise<DealActivity[]> {
        const { data, error } = await supabase
            .from('deal_activities')
            .select(`
        *,
        profiles (
          id,
          full_name
        )
      `)
            .eq('deal_id', dealId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((activity: any) => ({
            id: activity.id,
            dealId: activity.deal_id,
            userId: activity.user_id,
            userName: activity.profiles?.full_name,
            activityType: activity.activity_type,
            description: activity.description,
            metadata: activity.metadata,
            createdAt: activity.created_at
        }));
    },

    /**
     * Helper: Adicionar atividade
     */
    async addActivity(
        dealId: string,
        type: DealActivityType,
        description: string,
        metadata?: any
    ): Promise<DealActivity> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('deal_activities')
            .insert([{
                deal_id: dealId,
                user_id: user?.id,
                activity_type: type,
                description,
                metadata
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            dealId: data.deal_id,
            userId: data.user_id,
            activityType: data.activity_type,
            description: data.description,
            metadata: data.metadata,
            createdAt: data.created_at
        };
    },

    /**
     * Helper: Obter label traduzido da etapa
     */
    getStageLabel(stage: DealStage): string {
        const labels: Record<DealStage, string> = {
            'lead_quiz': 'Lead Quiz',
            'em_atendimento': 'Em Atendimento',
            'qualificado': 'Qualificado',
            'oferta_consulta': 'Oferta de Consulta',
            'consulta_aceita': 'Consulta Aceita',
            'consulta_paga': 'Consulta Paga',
            'ganho': 'Ganho',
            'consulta_realizada': 'Consulta Realizada',
            'perdido': 'Perdido'
        };
        return labels[stage] || stage;
    },

    /**
     * Helper: Obter label do motivo de perda
     */
    getLossReasonLabel(reason: LossReason): string {
        const labels: Record<LossReason, string> = {
            'bloqueou': 'Bloqueou',
            'sem_interesse': 'Sem Interesse',
            'nao_respondeu': 'Não Respondeu',
            'objecao_preco': 'Objeção: Preço',
            'objecao_tempo': 'Objeção: Tempo',
            'concorrente': 'Concorrente',
            'nao_pode_pagar': 'Não Pode Pagar'
        };
        return labels[reason] || reason;
    }
};

/**
 * Mapper: DB -> Deal
 */
function mapDbToDeal(dbDeal: any): Deal {
    return {
        id: dbDeal.id,
        leadId: dbDeal.lead_id,
        patientId: dbDeal.patient_id,
        clinicId: dbDeal.clinic_id,

        stage: dbDeal.stage,
        substatus: dbDeal.substatus,

        sellerId: dbDeal.seller_id,
        sellerName: dbDeal.profiles?.full_name,

        consultationFee: parseFloat(dbDeal.consultation_fee || '250'),

        contactAttempts: dbDeal.contact_attempts || 0,
        lastContactAt: dbDeal.last_contact_at,

        lossReason: dbDeal.loss_reason,
        lossDetails: dbDeal.loss_details,
        lostAt: dbDeal.lost_at,

        scheduledDate: dbDeal.scheduled_date,
        scheduledConfirmed: dbDeal.scheduled_confirmed || false,

        paymentStatus: dbDeal.payment_status,
        paymentId: dbDeal.payment_id,
        paymentGateway: dbDeal.payment_gateway,
        paidAt: dbDeal.paid_at,

        preSalesStarted: dbDeal.pre_sales_started || false,
        preSalesMessageSentAt: dbDeal.pre_sales_message_sent_at,
        slaAlertSent: dbDeal.sla_alert_sent || false,
        autoLostApplied: dbDeal.auto_lost_applied || false,

        createdAt: dbDeal.created_at,
        updatedAt: dbDeal.updated_at,
        enteredPipelineAt: dbDeal.entered_pipeline_at,

        metadata: dbDeal.metadata,

        lead: dbDeal.leads
    };
}
