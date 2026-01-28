import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../src/services/supabaseService';

// Icons using Material Symbols
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

type QuizData = {
    name: string;
    whatsapp: string;
    concerns: string[];
    procedure_awareness: string;
    previous_experience: string;
    budget_range: string;
    timeline: string;
    availability: string[];
    commitment_level: string;
    observations: string;
};

const INITIAL_DATA: QuizData = {
    name: '',
    whatsapp: '',
    concerns: [],
    procedure_awareness: '',
    previous_experience: '',
    budget_range: '',
    timeline: '',
    availability: [],
    commitment_level: '',
    observations: ''
};

interface LeadQuizProps {
    onBackendComplete?: () => void; // Optional callback for flow completion
}

const LeadQuiz: React.FC<LeadQuizProps> = ({ onBackendComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<QuizData>(INITIAL_DATA);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');

    const [finalScreenConfig, setFinalScreenConfig] = useState({
        title: 'Pronto!',
        message: 'Recebemos suas informações. Nossa IA está analisando seu perfil e nossa equipe entrará em contato pelo WhatsApp {phone} em breve.',
        buttonText: 'Voltar ao Início',
        buttonAction: 'reload',
        buttonUrl: ''
    });

    const [questions, setQuestions] = useState<any[]>([]);

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        const INITIAL_QUESTIONS = [
            {
                id: 'welcome',
                type: 'welcome',
                title: 'Realce sua Beleza Natural',
                subtitle: 'Responda algumas perguntas rápidas para que possamos entender seus objetivos e preparar um plano personalizado para você.',
                buttonText: 'Começar Agora'
            },
            {
                id: 'name',
                field: 'name',
                type: 'text',
                title: 'Qual é o seu nome?',
                placeholder: 'Digite seu nome completo',
                required: true
            },
            {
                id: 'whatsapp',
                field: 'whatsapp',
                type: 'phone',
                title: 'Qual WhatsApp podemos usar para falar com você?',
                subtitle: 'Enviaremos sua pré-avaliação por lá.',
                placeholder: '(11) 99999-9999',
                required: true
            },
            {
                id: 'concerns',
                field: 'concerns',
                type: 'multiselect',
                title: 'O que mais te incomoda hoje?',
                subtitle: 'Selecione todas as opções que se aplicam.',
                options: [
                    'Rugas de expressão', 'Flacidez facial', 'Papada', 'Contorno do rosto',
                    'Olheiras', 'Manchas / melasma', 'Textura da pele', 'Nariz',
                    'Queda capilar', 'Flacidez corporal', 'Quero melhorar tudo'
                ]
            },
            {
                id: 'procedure_awareness',
                field: 'procedure_awareness',
                type: 'select',
                title: 'Você já tem algum procedimento em mente?',
                options: [
                    'Já sei o que quero',
                    'Tenho uma ideia, quero orientação',
                    'Quero avaliação completa'
                ]
            },
            {
                id: 'previous_experience',
                field: 'previous_experience',
                type: 'select',
                title: 'Você já realizou algum procedimento estético antes?',
                options: [
                    'Sim, várias vezes',
                    'Sim, poucas vezes',
                    'Não, primeira vez'
                ]
            },
            {
                id: 'budget_range',
                field: 'budget_range',
                type: 'select',
                title: 'Em relação ao investimento, com qual faixa você se sente confortável?',
                options: [
                    'Até R$1.500',
                    'R$1.500 a R$3.000',
                    'R$3.000 a R$6.000',
                    'Acima de R$6.000',
                    'Prefiro entender antes'
                ]
            },
            {
                id: 'timeline',
                field: 'timeline',
                type: 'select',
                title: 'Em quanto tempo pretende realizar o procedimento?',
                options: [
                    'O quanto antes',
                    'Próximos 30 dias',
                    'Até 3 meses',
                    'Só pesquisando'
                ]
            },
            {
                id: 'availability',
                field: 'availability',
                type: 'multiselect',
                title: 'Em quais períodos você tem disponibilidade?',
                options: ['Manhã', 'Tarde', 'Noite', 'Flexível']
            },
            {
                id: 'commitment_level',
                field: 'commitment_level',
                type: 'select',
                title: 'Você entende que procedimentos exigem avaliação profissional e agenda organizada?',
                options: [
                    'Sim, estou ciente',
                    'Tenho dúvidas'
                ]
            },
            {
                id: 'observations',
                field: 'observations',
                type: 'textarea',
                title: 'Deseja deixar alguma observação ou objetivo específico?',
                placeholder: 'Ex: Tenho alergia a...',
                required: false
            }
        ];

        try {
            setLoading(true);
            const config = await supabaseService.getQuizConfig();
            console.log('LeadQuiz - Config loaded:', config);

            if (config) {
                if (config.questions && config.questions.length > 0) {
                    setQuestions(config.questions);
                } else {
                    setQuestions(INITIAL_QUESTIONS);
                }

                if (config.final_screen) {
                    setFinalScreenConfig(config.final_screen);
                }
            } else {
                setQuestions(INITIAL_QUESTIONS);
            }
        } catch (err) {
            console.error('Error loading questions, using default:', err);
            setQuestions(INITIAL_QUESTIONS);
        } finally {
            setLoading(false);
        }
    };

    const totalSteps = questions.length;
    const progress = ((step + 1) / totalSteps) * 100;

    const currentQuestion = questions[step] || {};

    const [error, setError] = useState<string | null>(null);

    const validateInput = () => {
        const field = currentQuestion.field;
        const value = data[field as keyof QuizData];

        if (field === 'name') {
            const nameVal = value as string;
            if (!nameVal || nameVal.trim().length < 3) return 'Nome muito curto (mínimo 3 caracteres).';
            if (nameVal.length > 50) return 'Nome muito longo (máximo 50 caracteres).';

            // Regex: Letters (accents included), spaces. No numbers, no symbols.
            const nameRegex = /^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ ]+$/;
            if (!nameRegex.test(nameVal)) return 'Digite um nome válido (somente letras e espaços).';

            if (!nameVal.trim()) return 'Nome não pode ser vazio.';
        }

        if (field === 'whatsapp') {
            const phoneVal = value as string;
            // Basic check: remove non-digits, check length (10 or 11 for BR)
            const digits = phoneVal.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 11) return 'Digite um telefone válido (com DDD).';
        }

        return null;
    };

    const formatPhoneNumber = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 10) {
            // (11) 9999-9999
            return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else {
            // (11) 99999-9999
            return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').substring(0, 15);
        }
    };

    const handleNext = async () => {
        const validationError = validateInput();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (step < totalSteps - 1) {
            setDirection('forward');
            setStep(step + 1);
        } else {
            submitQuiz();
        }
    };

    const handleBack = () => {
        setError(null);
        if (step > 0) {
            setDirection('back');
            setStep(step - 1);
        }
    };

    const updateData = (field: string, value: any) => {
        setError(null);
        setData(prev => ({ ...prev, [field]: value }));
    };

    const toggleSelection = (field: string, item: string) => {
        setError(null);
        setData(prev => {
            const list = prev[field as keyof QuizData] as string[];
            if (list.includes(item)) {
                return { ...prev, [field]: list.filter(i => i !== item) };
            } else {
                return { ...prev, [field]: [...list, item] };
            }
        });
    };

    const submitQuiz = async () => {
        setLoading(true);
        try {
            console.log('Submitting Quiz...', data);

            const { data: result, error } = await supabase.functions.invoke('new-lead', {
                body: data
            });

            if (error) throw error;

            console.log('LeadQuiz: Backend response:', result);

            // --- Client-Side Calibration Fix ---
            // Handle array, flat object, or nested { lead: ... } structure
            const leadData = Array.isArray(result) ? result[0] : (result.id ? result : (result.lead ? result.lead : null));

            if (leadData && leadData.id) {
                try {
                    const settingsVal = await supabaseService.getCRMSettings();
                    const settings = typeof settingsVal === 'string' ? JSON.parse(settingsVal) : (settingsVal || {});

                    const frioMax = Number(settings.frio_max) || 50;
                    const mornoMax = Number(settings.morno_max) || 80;
                    const quenteMax = Number(settings.quente_max) || 90;

                    const score = Number(leadData.ai_score) || 0;
                    const urgency = (leadData.ai_urgency || '').toLowerCase();

                    console.log('LeadQuiz: Calibration Params:', { score, urgency, settings });

                    let correctStatus = leadData.kanban_status;

                    // Calculate expected status
                    if (score >= quenteMax || urgency === 'imediata') {
                        correctStatus = 'Ultra Quente';
                    } else if (score >= mornoMax || urgency === 'alta') {
                        correctStatus = 'Quente';
                    } else if (score >= frioMax || urgency === 'média') {
                        correctStatus = 'Morno';
                    }
                    // Note: If "Frio", we generally trust it unless score says otherwise.
                    // If backend returned "Frio" but score is 90, we override to Ultra Quente.

                    // Normalize for comparison (DB might include 'Cold' vs 'Frio' mismatch handling from service)
                    const currentStatusNormalized = leadData.kanban_status === 'Cold' ? 'Frio' : leadData.kanban_status;

                    if (correctStatus !== currentStatusNormalized) {
                        console.log(`LeadQuiz: STATUS CORRECTION TRIGGERED. Changing ${currentStatusNormalized} -> ${correctStatus}`);
                        await supabaseService.updateLead(leadData.id, { kanban_status: correctStatus });
                    } else {
                        console.log('LeadQuiz: Status match, no correction needed.');
                    }
                } catch (calibError) {
                    console.error('LeadQuiz: Error applying calibration fix', calibError);
                }
            } else {
                console.warn('LeadQuiz: Could not identify lead ID in result to apply fix.', result);
            }
            // -----------------------------------------------------------------------

            console.log('Lead created successfully:', result);
            setFinished(true);
            if (onBackendComplete) onBackendComplete();
        } catch (err: any) {
            console.error('Error submitting quiz:', err);
            alert('Ocorreu um erro ao enviar suas respostas. Por favor, tente novamente.\n' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const handleFinalAction = () => {
        const action = finalScreenConfig.buttonAction || 'reload';

        if (action === 'reload') {
            window.location.reload();
        } else if (action === 'redirect' && finalScreenConfig.buttonUrl) {
            window.location.href = finalScreenConfig.buttonUrl;
        } else {
            // 'none' or default fallback if no URL
            // Do nothing, or maybe show a toast?
            // "Finalizar" might mean just let the user leave the page manually.
        }
    };

    // Validation
    const canProceed = () => {
        if (!currentQuestion) return false;
        if (currentQuestion.type === 'welcome') return true;
        if (currentQuestion.required === false) return true;

        // Check specific fields
        const value = data[currentQuestion.field as keyof QuizData];
        if (Array.isArray(value)) return value.length > 0;
        return !!value && value.toString().length > 0;
    };

    if (loading && questions.length === 0) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <Icon name="progress_activity" className="animate-spin text-4xl text-primary" />
            </div>
        );
    }

    if (finished) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-dark to-purple flex items-center justify-center p-0 sm:p-4 text-white text-center animate-fade-in">
                <div className="w-full h-screen sm:h-auto max-w-2xl bg-white text-gray-800 sm:rounded-3xl p-8 sm:p-12 shadow-none sm:shadow-2xl flex flex-col justify-center items-center">
                    <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-8 transform scale-110">
                        <Icon name="check_circle" className="text-6xl" />
                    </div>
                    <h2 className="text-4xl font-bold mb-6 text-primary">{finalScreenConfig.title}</h2>
                    <p className="text-gray-600 mb-10 text-xl leading-relaxed max-w-lg">
                        {finalScreenConfig.message.replace('{phone}', data.whatsapp ? `${data.whatsapp}` : '')}
                    </p>
                    <button
                        onClick={handleFinalAction}
                        className={`w-full max-w-md py-5 bg-gray-100 text-gray-700 text-xl font-bold rounded-2xl hover:bg-gray-200 transition-colors ${(!finalScreenConfig.buttonAction || finalScreenConfig.buttonAction === 'none') ? 'cursor-default hover:bg-gray-100' : ''}`}
                    >
                        {finalScreenConfig.buttonText}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fff0f5] flex flex-col font-display overflow-hidden relative">
            {/* Watercolor Background Effect */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[70vw] h-[70vw] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>
                <div className="absolute bottom-[-10%] right-[20%] w-[70vw] h-[70vw] bg-pink-100/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-6000"></div>
            </div>

            {/* Header / Progress */}
            <div className="h-2 bg-gray-200/20 w-full fixed top-0 z-50 backdrop-blur-sm">
                <div
                    className="h-full bg-gradient-to-r from-primary to-purple transition-all duration-500 ease-out shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-0 sm:p-12 relative max-w-4xl mx-auto w-full z-10">
                <div className="bg-white/90 sm:bg-white/70 backdrop-blur-xl sm:rounded-3xl shadow-none sm:shadow-xl w-full h-full sm:h-auto min-h-screen sm:min-h-0 p-6 sm:p-12 animate-slide-up border-0 sm:border border-white/60 flex flex-col justify-center">
                    {step > 0 && (
                        <button
                            onClick={handleBack}
                            className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 mb-6"
                        >
                            <Icon name="arrow_back" /> Voltar
                        </button>
                    )}

                    <div className="w-full">
                        {/* Question Render */}
                        <div className="mb-0">
                            {currentQuestion.type !== 'welcome' && (
                                <span className="text-sm font-semibold text-primary mb-2 block tracking-wider uppercase">
                                    Passo {step} de {totalSteps - 1}
                                </span>
                            )}

                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-900 mb-4 leading-tight">
                                {currentQuestion.title}
                            </h1>

                            {currentQuestion.subtitle && (
                                <p className="text-lg text-gray-500 dark:text-gray-600 mb-8 leading-relaxed">
                                    {currentQuestion.subtitle}
                                </p>
                            )}

                            {/* Input Types */}
                            <div className="space-y-4 min-h-[50px]">

                                {currentQuestion.type === 'text' && (
                                    <input
                                        type="text"
                                        value={data[currentQuestion.field as keyof QuizData] as string}
                                        onChange={(e) => updateData(currentQuestion.field!, e.target.value)}
                                        placeholder={currentQuestion.placeholder}
                                        className="w-full text-2xl bg-transparent border-b-2 border-gray-300 focus:border-primary text-gray-800 py-3 outline-none transition-all placeholder:text-gray-400"
                                        autoFocus
                                    />
                                )}

                                {currentQuestion.type === 'phone' && (
                                    <input
                                        type="tel"
                                        value={data[currentQuestion.field as keyof QuizData] as string}
                                        onChange={(e) => updateData(currentQuestion.field!, formatPhoneNumber(e.target.value))}
                                        placeholder={currentQuestion.placeholder}
                                        className="w-full text-2xl bg-transparent border-b-2 border-gray-300 focus:border-primary text-gray-800 py-3 outline-none transition-all placeholder:text-gray-400"
                                        autoFocus
                                    />
                                )}

                                {currentQuestion.type === 'textarea' && (
                                    <textarea
                                        value={data[currentQuestion.field as keyof QuizData] as string}
                                        onChange={(e) => updateData(currentQuestion.field!, e.target.value)}
                                        placeholder={currentQuestion.placeholder}
                                        rows={4}
                                        className="w-full text-xl bg-gray-50 rounded-xl p-4 border-2 border-transparent focus:border-primary text-gray-800 outline-none transition-all placeholder:text-gray-400 resize-none"
                                        autoFocus
                                    />
                                )}

                                {currentQuestion.type === 'select' && currentQuestion.options && (
                                    <div className="grid gap-3">
                                        {currentQuestion.options.map((opt: string) => (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    updateData(currentQuestion.field!, opt);
                                                }}
                                                className={`text-left p-6 rounded-xl border-2 transition-all flex items-center justify-between group
                        ${data[currentQuestion.field as keyof QuizData] === opt
                                                        ? 'border-primary bg-primary/5 text-primary shadow-lg ring-1 ring-primary'
                                                        : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                                    }
                      `}
                                            >
                                                <span className="text-2xl font-medium text-gray-800 leading-snug">{opt}</span>
                                                {data[currentQuestion.field as keyof QuizData] === opt && (
                                                    <Icon name="check_circle" className="text-3xl text-primary" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion.type === 'multiselect' && currentQuestion.options && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {currentQuestion.options.map((opt: string) => {
                                            const selected = (data[currentQuestion.field as keyof QuizData] as string[]).includes(opt);
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => toggleSelection(currentQuestion.field!, opt)}
                                                    className={`text-left p-6 rounded-xl border-2 transition-all flex items-center justify-between
                          ${selected
                                                            ? 'border-primary bg-primary/5 text-primary shadow-md'
                                                            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                                        }
                        `}
                                                >
                                                    <span className="text-xl font-medium text-gray-800 leading-snug">{opt}</span>
                                                    {selected && <Icon name="check" className="text-2xl" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                            </div>

                            {error && (
                                <p className="text-red-500 text-sm mt-3 animate-pulse font-bold bg-red-50 p-2 rounded-lg border border-red-200 inline-block">
                                    <Icon name="error" className="align-middle mr-1" />
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleNext}
                                disabled={!canProceed() || loading}
                                className={`
              w-full py-4 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform active:scale-[0.98]
              ${canProceed()
                                        ? 'bg-gradient-to-r from-primary to-primary-dark text-white hover:opacity-90'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
            `}
                            >
                                {loading ? (
                                    <Icon name="progress_activity" className="animate-spin" />
                                ) : (
                                    <>
                                        {currentQuestion.buttonText || (step === totalSteps - 1 ? 'Finalizar' : 'Próximo')}
                                        {step < totalSteps - 1 && <Icon name="arrow_forward" />}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadQuiz;
