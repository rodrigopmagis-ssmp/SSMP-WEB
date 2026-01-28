
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
  created_at: string;
}
