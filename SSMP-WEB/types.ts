
export enum PatientStatus {
  DUE_TODAY = 'Vence Hoje',
  LATE = 'Atrasado',
  ON_TIME = 'No Prazo'
}

export enum SurveyStatus {
  PENDING = 'Pendente',
  SENT = 'Enviado',
  RESPONDED = 'Respondido'
}

export interface Survey {
  status: SurveyStatus;
  sentAt?: string;
  respondedAt?: string;
  rating?: number;
  comment?: string;
}

export interface FollowUpTask {
  id: string;
  title: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'COMPLETED' | 'PENDING' | 'OPEN';
  description: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  procedures: string[];
  procedureDate: string;
  lastVisit: string;
  status: PatientStatus;
  avatar?: string;
  progress?: number;
  tasksCompleted?: number;

  totalTasks?: number;
  // photos: string[]; // Removed in favor of patient_photos table
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: string;
  profession?: string;
  address?: string;
  rg?: string;
  cnpj?: string;
  race?: string;
  origin?: string;
  healthInsurance?: string;
  survey?: Survey;
  cpf?: string;
  stageData?: Record<string, StageData>;
  activeTreatmentsCount?: number;
  completedTreatmentsCount?: number;
  tags?: { id: string; name: string; color: string; metadata?: any; }[];
}

export interface StageData {
  messageSentAt?: string;
  messageRespondedAt?: string;
  responseContent?: string;
  checklist?: Record<string, boolean>;
  hasResponded?: boolean;
  // Photo Workflow
  photoRequestSentAt?: string;
  photoReceivedAt?: string;
  photoStatus?: 'pending' | 'sent' | 'received' | 'refused';
  photoUrl?: string;
}

export interface PatientPhoto {
  id: string;
  patientId: string;
  treatmentId?: string;
  stageId?: string;
  photoUrl: string;
  createdAt: string;
  metadata?: any;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  audioPath?: string;
  rawTranscript?: string;
  cleanTranscript?: string;
  aiProntuario?: any;
  aiResumo?: string;
  status: 'draft' | 'processing' | 'review_needed' | 'signed';
  metadata?: any;
  createdAt: string;
}

export interface PatientMemory {
  id: string;
  patientId: string;
  type: string;
  description: string;
  suggestion?: string;
  isActive: boolean;
  sourceConsultationId?: string;
  createdAt: string;
}

export interface Procedure {
  id: string;
  name: string;
  icon: string;
  description: string;
  scripts: ScriptStage[];
  hasSurvey?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  category_id?: string;
  price?: number | null;
  promotional_price?: number | null;
  use_in_budget?: boolean;
  budget_description?: string;
  allows_sessions?: boolean;
}

export interface Budget {
  id: string;
  patient_id: string;
  patient?: Patient; // Join
  clinic_id?: string;
  clinic?: Clinic; // Join
  status: 'draft' | 'sent' | 'approved' | 'cancelled';
  payment_method?: 'pix' | 'credit_card' | 'boleto' | 'cash';
  installments?: number;
  card_fee_percent?: number;
  subtotal: number;
  total_with_fee: number;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  items?: BudgetItem[];
  payment_methods?: PaymentItem[];
}

export interface PaymentItem {
  method: 'pix' | 'credit_card' | 'boleto' | 'cash';
  amount: number;
  installments?: number;
  card_fee_percent?: number;
  discount?: number;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  procedure_id?: string;
  procedure_name_snapshot: string;
  description_snapshot?: string;
  unit_price: number;
  sessions: number;
  unit?: string; // e.g., 'sessions' | 'quantity'
  discount?: number;
  total_price: number;
  created_at: string;
}

export interface ProcedureCategory {
  id: string;
  name: string;
  clinic_id?: string;
  created_at: string;
}

// Novos tipos para timing estruturado
export enum TimingUnit {
  MINUTES = 'minutos',
  HOURS = 'horas',
  DAYS = 'dias',
  WEEKS = 'semanas'
}

export interface DelayTiming {
  value: number;
  unit: TimingUnit;
}

export interface SpecificTiming {
  daysAfter: number;
  time: string; // HH:mm
}

export interface ActionItem {
  id: string;
  description: string;
  completed: boolean;
  type: 'message' | 'photo_request' | 'call' | 'appointment' | 'custom';
}

export interface ScriptStage {
  id: string;
  title: string;
  // Novo sistema de timing estruturado
  timing: {
    type: 'delay' | 'specific';
    delay?: DelayTiming;
    specific?: SpecificTiming;
  };
  delay?: string; // Manter para compatibilidade com dados antigos
  template: string;
  autoSend: boolean;
  attachPdf: boolean;
  requestMedia: boolean;
  actions?: ActionItem[]; // Novo: checklist de ações
  type?: 'standard' | 'service_survey' | 'outcome_survey';
}

export interface PatientTreatment {
  id: string;
  patientId: string;
  procedureId: string;
  procedureName: string;
  startedAt: string;
  status: 'active' | 'completed' | 'cancelled';
  tasksCompleted: number;
  totalTasks: number;
  progress: number;
  stageData?: Record<string, StageData>;
  surveyStatus: SurveyStatus;
  surveyData?: Survey;
  scripts?: ScriptStage[]; // Snapshot dos estágios no momento da criação
}

export interface ClinicalNote {
  id: string;
  patient_id: string;
  content: string;
  created_at: string;
  created_by?: string;
}

export interface TreatmentLog {
  id: string;
  treatment_id: string;
  action: string;
  description: string;
  user_id?: string;
  created_at: string;
  metadata?: any;
  // Optional: extended info if join is made
  user_email?: string;
}

export interface Clinic {
  id: string;
  user_id: string;
  type: 'fisica' | 'juridica';

  // Identification
  cpf_cnpj: string;
  fantasy_name: string;
  owner_name: string;

  // Contact
  phone: string;
  email: string;

  // Address
  has_address: boolean;
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  country?: string;

  // Billing Address
  same_address_for_billing?: boolean;
  billing_zip_code?: string;
  billing_street?: string;
  billing_number?: string;
  billing_complement?: string;
  billing_neighborhood?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;

  // Branding
  logo_url?: string;

  // Quiz Link
  slug?: string;

  // Business name (for legal entities)
  business_name?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'master' | 'admin' | 'doctor' | 'receptionist';
  status: 'pending' | 'approved' | 'rejected';
  clinic_id?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  concerns: string[];
  procedure_awareness: string;
  previous_experience: string;
  budget_range: string;
  timeline: string;
  availability: string[];
  commitment_level: string;
  observations?: string;
  ai_tags?: string[];
  ai_score?: number;
  ai_urgency?: 'baixa' | 'média' | 'alta';
  ai_summary?: string;
  kanban_status: 'Frio' | 'Morno' | 'Quente' | 'Ultra Quente';
  protocol_data?: any;
  procedure_id?: string;
  clinic_id?: string;
  campaign_id?: string;
  created_at: string;
}

// ============================================
// Sales Pipeline (Negócios) Types
// ============================================

export type Estagio =
  | 'lead_quiz'
  | 'em_atendimento'
  | 'qualificado'
  | 'oferta_consulta'
  | 'consulta_aceita'
  | 'consulta_paga'
  | 'ganho'
  | 'consulta_realizada'
  | 'perdido'
  | string; // Allow dynamic strings for custom stages

export interface CampaignStage {
  id: string;
  campaign_id: string;
  title: string;
  position: number;
  color?: string;
  is_system_default?: boolean;
}

export interface Campaign {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  stages?: CampaignStage[];
  quiz_config?: any;
  external_quiz_url?: string;
  followup_config?: ScriptStage[];
  created_at?: string;
}

export type StatusPagamento =
  | 'pendente'
  | 'processando'
  | 'pago'
  | 'falhou'
  | 'reembolsado';

export type MotivoPerda =
  | 'bloqueou'
  | 'sem_interesse'
  | 'nao_respondeu'
  | 'objecao_preco'
  | 'objecao_tempo'
  | 'concorrente'
  | 'nao_pode_pagar';

export type TipoAtividade =
  | 'mudanca_estagio'
  | 'tentativa_contato'
  | 'nota'
  | 'atualizacao_pagamento'
  | 'agendado'
  | 'perdido'
  | 'reativado';

export interface Negocio {
  id: string;
  id_lead: string;
  id_paciente?: string;
  id_clinica: string;

  // Campanha e Estágio
  campaign_id?: string;
  stage_id?: string;

  // Etapa do Pipeline (Mantido para compatibilidade, mas idealmente migrado para stage_id)
  estagio: Estagio;
  subestagio?: string;

  // Responsabilidade
  id_vendedor?: string;
  nome_vendedor?: string; // Populado via join

  // Valor do Negócio
  valor_consulta: number;

  // Rastreamento de Contato
  tentativas_contato: number;
  ultimo_contato_em?: string;

  // Rastreamento de Perda
  motivo_perda?: MotivoPerda;
  detalhes_perda?: string;
  perdido_em?: string;

  // Agendamento
  data_agendamento?: string;
  agendamento_confirmado: boolean;

  // Pagamento
  status_pagamento: StatusPagamento;
  id_pagamento?: string;
  gateway_pagamento?: string;
  pago_em?: string;

  // Flags de Automação
  pre_vendas_iniciado: boolean;
  pre_vendas_mensagem_em?: string;
  alerta_sla_enviado: boolean;
  perda_automatica_aplicada: boolean;

  // Timestamps
  criado_em: string;
  atualizado_em: string;
  entrou_pipeline_em?: string;

  // Metadados
  metadados?: any;

  // Populado via joins
  lead?: Lead;
}

export interface AtividadeNegocio {
  id: string;
  id_negocio: string;
  id_usuario: string;
  nome_usuario?: string; // Populado via join

  tipo_atividade: TipoAtividade;
  descricao: string;
  metadados?: any;

  criado_em: string;
}

export interface FiltrosNegocio {
  estagio?: Estagio;
  id_vendedor?: string;
  assignedTo?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  minValue?: number;
  maxValue?: number;
  paymentStatus?: string;
  searchTerm?: string;
}

export interface EstatisticasNegocio {
  total_negocios: number;
  por_estagio: Record<Estagio, number>;
  taxa_conversao: number;
  tempo_medio_pipeline: number; // em dias
  receita_total: number;
}


// ============================================
// Ombudsman (Ouvidoria) Types
// ============================================

export type ComplaintStatus = 'nova' | 'em_analise' | 'aguardando_acao' | 'em_negociacao' | 'resolvida' | 'escalada' | 'encerrada';

// Status de Resolução Final (9 opções)
export type ComplaintResolutionStatus =
  | 'resolvida'                    // Resolvida
  | 'resolvida_acompanhamento'     // Resolvida com Acompanhamento
  | 'nao_procedente'               // Não Procedente
  | 'parcialmente_resolvida'       // Parcialmente Resolvida
  | 'nao_resolvida'                // Não Resolvida
  | 'encerrada_inatividade'        // Encerrada por Inatividade
  | 'cancelada_duplicada'          // Cancelada / Duplicada
  | 'encerrada_acordo'             // Encerrada por Acordo
  | 'encerrada_juridico';          // Encerrada com Escalonamento Jurídico
export type ComplaintSeverity = 'baixa' | 'media' | 'alta' | 'critica';

export interface OmbudsmanComplaint {
  id: string;
  patient_id: string;
  description: string;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  type: string;
  origin: string;
  category?: string;
  subcategory?: string;
  responsible_area?: string;
  risk_legal: boolean;
  risk_reputation: boolean;
  risk_financial: boolean;
  clinic_id?: string;
  created_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  sla_deadline?: string;
  sla_status?: 'on_time' | 'at_risk' | 'overdue';
  sla_days?: number;
  // Campos de Resolução/Encerramento
  resolution_status?: ComplaintResolutionStatus;
  resolution_reason?: string;
  resolved_at?: string;
  resolved_by?: string;
  patient?: Patient; // Joined
  employee?: UserProfile; // Joined (assigned_to)
}

export interface OmbudsmanTimeline {
  id: string;
  complaint_id: string;
  action: string;
  description: string;
  metadata?: any;
  created_by?: string;
  created_at: string;
  user_email?: string; // For display purposes
}

export type ContactType = 'outgoing' | 'incoming';
export type ContactMethod = 'phone' | 'whatsapp' | 'email' | 'in_person';
export type ResponseStatus = 'pending' | 'responded' | 'no_response';

export interface OmbudsmanContact {
  id: string;
  complaint_id: string;
  contact_type: ContactType;
  contact_method: ContactMethod;
  message: string;
  response?: string;
  contacted_at: string;
  responded_at?: string;
  response_status: ResponseStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Tipos: Módulo de Tarefas & Lembretes
// ============================================

export enum TaskType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TaskStatusEnum {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  RESTRICTED = 'restricted'
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  assignedAt: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export interface TaskCategory {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color code (e.g., #EC4899)
  icon: string; // Material Symbols icon name
  clinicId?: string;
  isActive: boolean;
  isDefault: boolean; // System default categories
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatusEnum;
  priority: TaskPriority;
  categoryId?: string; // NEW: Category reference
  category?: TaskCategory; // NEW: Populated category data
  dueAt?: string;
  reminderMinutes?: number;
  recurrenceRule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval?: number;
    endDate?: string;
    daysOfWeek?: number[];
    count?: number;
    index?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
  assignments?: TaskAssignment[];
  assigneeIds?: string[];
  visibility?: TaskVisibility;
  clinicId?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  clinicId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'comprovante_pagamento' | 'foto_paciente' | 'boleto';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
// ... existing code ...

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string | null;
  action: string;
  details: any;
  createdAt: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export enum TaskHistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGE = 'STATUS_CHANGE',
  COMMENT_ADDED = 'COMMENT_ADDED',
  ASSIGNED = 'ASSIGNED'
}
