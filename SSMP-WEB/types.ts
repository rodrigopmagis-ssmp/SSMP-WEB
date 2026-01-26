
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
  photos: string[];
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
