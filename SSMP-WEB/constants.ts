
import { Patient, PatientStatus, Procedure, SurveyStatus, TimingUnit } from './types';

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'Joana Silva',
    phone: '+55 (11) 91234-5678',
    email: 'joana.silva@exemplo.com.br',
    dob: '12/03/1994',
    procedures: ['Botox', 'Preenchimento Labial'],
    procedureDate: '24/10/2023 14:00',
    lastVisit: '24/10/2023',
    status: PatientStatus.DUE_TODAY,
    progress: 40,
    tasksCompleted: 2,
    totalTasks: 5,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
    photos: [
      'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=400&h=400'
    ],
    survey: {
      status: SurveyStatus.PENDING
    }
  },
  {
    id: '2',
    name: 'Alice Oliveira',
    phone: '+55 (11) 98765-4321',
    email: 'alice@exemplo.com.br',
    dob: '21/07/1988',
    procedures: ['Rinoplastia'],
    procedureDate: '24/10/2023 09:30',
    lastVisit: '24/10/2023',
    status: PatientStatus.DUE_TODAY,
    progress: 60,
    tasksCompleted: 3,
    totalTasks: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&h=200',
    photos: [],
    survey: {
      status: SurveyStatus.PENDING
    }
  },
  {
    id: '3',
    name: 'Ricardo Mendes',
    phone: '+55 (21) 99988-7766',
    email: 'ricardo@exemplo.com.br',
    dob: '15/11/1982',
    procedures: ['Lifting Facial'],
    procedureDate: '22/10/2023 11:00',
    lastVisit: '22/10/2023',
    status: PatientStatus.LATE,
    progress: 20,
    tasksCompleted: 1,
    totalTasks: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    photos: [],
    survey: {
      status: SurveyStatus.PENDING
    }
  },
  {
    id: '4',
    name: 'Luciana Hiroshi',
    phone: '+55 (11) 91111-2222',
    email: 'luciana@exemplo.com.br',
    dob: '05/01/1990',
    procedures: ['Lipoaspiração'],
    procedureDate: '25/10/2023 14:00',
    lastVisit: '25/10/2023',
    status: PatientStatus.ON_TIME,
    progress: 80,
    tasksCompleted: 4,
    totalTasks: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
    photos: [],
    survey: {
      status: SurveyStatus.PENDING
    }
  }
];

export const PROCEDURES: Procedure[] = [
  {
    id: 'botox',
    name: 'Botox',
    icon: 'vaccines',
    description: 'Neuromodulador para redução de rugas',
    scripts: [
      {
        id: 's1',
        title: 'Check-in Imediato',
        timing: {
          type: 'delay',
          delay: {
            value: 2,
            unit: TimingUnit.HOURS
          }
        },
        delay: '2 horas depois',
        template: 'Olá #NomePaciente, aqui é da #NomeClinica. Esperamos que esteja se sentindo bem após o procedimento de Botox! 💖 Apenas um lembrete rápido: evite deitar ou fazer exercícios intensos pelas próximas 4 horas. Qualquer dúvida, estamos aqui!',
        autoSend: true,
        attachPdf: true,
        requestMedia: false,
        actions: [
          { id: 'a1', description: 'Enviar mensagem WhatsApp', completed: false, type: 'message' }
        ]
      },
      {
        id: 's2',
        title: 'Foto da Manhã Seguinte',
        timing: {
          type: 'specific',
          specific: {
            daysAfter: 1,
            time: '08:00'
          }
        },
        delay: 'Dia seguinte às 08:00',
        template: 'Bom dia, #NomePaciente! Como está sua recuperação? Poderia nos enviar uma foto rápida da área tratada? Isso ajuda nossos especialistas a garantir que tudo está cicatrizando perfeitamente. ✨',
        autoSend: false,
        attachPdf: false,
        requestMedia: true,
        actions: [
          { id: 'a1', description: 'Enviar mensagem WhatsApp', completed: false, type: 'message' },
          { id: 'a2', description: 'Solicitar fotos de acompanhamento', completed: false, type: 'photo_request' }
        ]
      }
    ],
    hasSurvey: true
  },
  {
    id: 'filler',
    name: 'Preenchimento Labial',
    icon: 'face',
    description: 'Preenchedores dérmicos para volume',
    scripts: [
      {
        id: 'f1',
        title: 'Cuidados Pós-Aplicação',
        timing: {
          type: 'delay',
          delay: {
            value: 4,
            unit: TimingUnit.HOURS
          }
        },
        delay: '4 horas depois',
        template: 'Olá #NomePaciente! Tudo bem? Passando para saber como você está se sentindo após o preenchimento. Lembre-se de colocar gelo se houver inchaço e evitar massagear a região. 😘',
        autoSend: true,
        attachPdf: true,
        requestMedia: false,
        actions: [
          { id: 'a1', description: 'Enviar mensagem WhatsApp', completed: false, type: 'message' }
        ]
      },
      {
        id: 'f2',
        title: 'Acompanhamento 24h',
        timing: {
          type: 'specific',
          specific: {
            daysAfter: 1,
            time: '09:00'
          }
        },
        delay: 'Dia seguinte às 09:00',
        template: 'Bom dia #NomePaciente! Como amanheceu o inchaço? É normal estar um pouco sensível. Se puder, mande uma foto para avaliarmos.',
        autoSend: false,
        attachPdf: false,
        requestMedia: true,
        actions: [
          { id: 'a1', description: 'Enviar mensagem WhatsApp', completed: false, type: 'message' },
          { id: 'a2', description: 'Solicitar foto', completed: false, type: 'photo_request' }
        ]
      }
    ],
    hasSurvey: false
  }
];
