import React, { useState, useEffect } from 'react';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export interface Question {
    id: string;
    type: 'text' | 'select' | 'multiselect' | 'textarea' | 'phone' | 'welcome';
    title: string;
    subtitle?: string;
    placeholder?: string;
    options?: string[];
    field?: string;
    required?: boolean;
    buttonText?: string;
}

export interface QuizConfig {
    questions: Question[];
    final_screen?: {
        title: string;
        message: string;
        buttonText: string;
        buttonAction: string;
        buttonUrl: string;
    };
}

interface QuizEditorProps {
    initialQuestions?: Question[];
    initialFinalScreen?: any;
    onSave: (questions: Question[], finalScreen: any) => Promise<void>;
    saving?: boolean;
    loading?: boolean;
    title?: string;
    description?: string;
}

const DEFAULT_QUESTIONS: Question[] = [
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

const DEFAULT_FINAL_SCREEN = {
    title: 'Pronto!',
    message: 'Recebemos suas informações. Nossa IA está analisando seu perfil e nossa equipe entrará em contato pelo WhatsApp em breve.',
    buttonText: 'Voltar ao Início',
    buttonAction: 'reload',
    buttonUrl: ''
};

export const QuizEditor: React.FC<QuizEditorProps> = ({
    initialQuestions,
    initialFinalScreen,
    onSave,
    saving = false,
    loading = false,
    title = "Editor do Quiz",
    description = "Personalize as perguntas e a tela final do formulário."
}) => {
    const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
    const [finalScreen, setFinalScreen] = useState(DEFAULT_FINAL_SCREEN);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [expandedFinalScreen, setExpandedFinalScreen] = useState(false);

    // Initialize state when props change (or on mount)
    useEffect(() => {
        if (initialQuestions && initialQuestions.length > 0) {
            setQuestions(initialQuestions);
        }
        if (initialFinalScreen) {
            setFinalScreen({ ...DEFAULT_FINAL_SCREEN, ...initialFinalScreen });
        }
    }, [initialQuestions, initialFinalScreen]);

    const handleSaveClick = async () => {
        await onSave(questions, finalScreen);
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const updateOption = (qId: string, idx: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOptions = [...(q.options || [])];
            newOptions[idx] = value;
            return { ...q, options: newOptions };
        }));
    };

    const addOption = (qId: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            return { ...q, options: [...(q.options || []), 'Nova Opção'] };
        }));
    };

    const removeOption = (qId: string, idx: number) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            return { ...q, options: (q.options || []).filter((_, i) => i !== idx) };
        }));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando editor...</div>;

    return (
        <div className="space-y-6 h-full overflow-y-auto pr-2 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#2d181e] p-6 rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                </div>
                <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-all shadow-md disabled:opacity-50"
                >
                    {saving ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="save" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="space-y-4">
                {questions.map((q, index) => (
                    <div key={q.id} className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm overflow-hidden">
                        <div
                            className="p-4 flex items-center justify-between bg-gray-50/50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                        >
                            <div className="flex items-center gap-3">
                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{q.title}</span>
                                <span className="text-xs uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                    {q.type}
                                </span>
                            </div>
                            <Icon name={expandedQuestion === q.id ? "expand_less" : "expand_more"} className="text-gray-400" />
                        </div>

                        {expandedQuestion === q.id && (
                            <div className="p-6 space-y-4 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Pergunta</label>
                                    <input
                                        type="text"
                                        value={q.title}
                                        onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                    />
                                </div>

                                {q.subtitle !== undefined && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subtítulo (Opcional)</label>
                                        <input
                                            type="text"
                                            value={q.subtitle}
                                            onChange={(e) => updateQuestion(q.id, { subtitle: e.target.value })}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                        />
                                    </div>
                                )}

                                {q.placeholder !== undefined && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Placeholder</label>
                                        <input
                                            type="text"
                                            value={q.placeholder}
                                            onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                        />
                                    </div>
                                )}

                                {(q.type === 'select' || q.type === 'multiselect') && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opções</label>
                                        <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                                            {q.options?.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => updateOption(q.id, idx, e.target.value)}
                                                        className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-sm"
                                                    />
                                                    <button
                                                        onClick={() => removeOption(q.id, idx)}
                                                        title="Remover opção"
                                                        className="text-red-400 hover:text-red-500 p-1"
                                                    >
                                                        <Icon name="delete" className="text-lg" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addOption(q.id)}
                                                className="text-primary text-sm font-bold hover:underline mt-2 flex items-center gap-1"
                                            >
                                                <Icon name="add" className="text-base" /> Adicionar Opção
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Final Screen Editor */}
                <div className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm overflow-hidden mt-8 border-l-4 border-l-green-500">
                    <div
                        className="p-4 flex items-center justify-between bg-green-50/50 dark:bg-green-900/10 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                        onClick={() => setExpandedFinalScreen(!expandedFinalScreen)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                <Icon name="flag" className="text-sm" />
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Tela de Sucesso (Final)</span>
                        </div>
                        <Icon name={expandedFinalScreen ? "expand_less" : "expand_more"} className="text-gray-400" />
                    </div>

                    {expandedFinalScreen && (
                        <div className="p-6 space-y-4 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                <input
                                    type="text"
                                    value={finalScreen.title}
                                    onChange={(e) => setFinalScreen({ ...finalScreen, title: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                                <textarea
                                    value={finalScreen.message}
                                    onChange={(e) => setFinalScreen({ ...finalScreen, message: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-400 mt-1">Dica: Use <strong>{'{phone}'}</strong> para exibir o WhatsApp do lead.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ação do Botão</label>
                                <select
                                    value={finalScreen.buttonAction || 'reload'}
                                    onChange={(e) => setFinalScreen({ ...finalScreen, buttonAction: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                >
                                    <option value="reload">Reiniciar Quiz (Padrão)</option>
                                    <option value="redirect">Abrir Link Externo</option>
                                    <option value="none">Nenhuma Ação (Apenas Finalizar)</option>
                                </select>
                            </div>

                            {finalScreen.buttonAction === 'redirect' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL de Redirecionamento</label>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={finalScreen.buttonUrl || ''}
                                        onChange={(e) => setFinalScreen({ ...finalScreen, buttonUrl: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto do Botão</label>
                                <input
                                    type="text"
                                    value={finalScreen.buttonText}
                                    onChange={(e) => setFinalScreen({ ...finalScreen, buttonText: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
