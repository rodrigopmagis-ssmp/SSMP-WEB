import React, { useState } from 'react';
import { ScriptStage, TimingUnit, ActionItem } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface StageEditorProps {
    initialData?: ScriptStage;
    onSave: (stage: ScriptStage) => void;
    onCancel: () => void;
}

const StageEditor: React.FC<StageEditorProps> = ({ initialData, onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'basic' | 'message' | 'actions' | 'settings'>('basic');

    // Detectar se é dado antigo (só tem delay string) ou novo (tem timing)
    const hasNewTiming = initialData?.timing !== undefined;
    const defaultTimingType = hasNewTiming ? initialData.timing.type : 'delay';

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        timingType: defaultTimingType as 'delay' | 'specific',
        delayValue: initialData?.timing?.delay?.value || 2,
        delayUnit: initialData?.timing?.delay?.unit || TimingUnit.DAYS,
        specificDays: initialData?.timing?.specific?.daysAfter || 1,
        specificTime: initialData?.timing?.specific?.time || '08:00',
        template: initialData?.template || '',
        autoSend: initialData?.autoSend || false,
        attachPdf: initialData?.attachPdf || false,
        requestMedia: initialData?.requestMedia || false,
    });

    const [actions, setActions] = useState<ActionItem[]>(
        initialData?.actions || [
            { id: '1', description: 'Enviar mensagem WhatsApp', completed: false, type: 'message' },
        ]
    );

    const [newActionText, setNewActionText] = useState('');

    const handleAddAction = () => {
        if (!newActionText.trim()) return;
        const newAction: ActionItem = {
            id: Date.now().toString(),
            description: newActionText,
            completed: false,
            type: 'custom',
        };
        setActions([...actions, newAction]);
        setNewActionText('');
    };

    const handleRemoveAction = (id: string) => {
        setActions(actions.filter(a => a.id !== id));
    };

    const handleAddPredefinedAction = (type: ActionItem['type'], description: string) => {
        const newAction: ActionItem = {
            id: Date.now().toString(),
            description,
            completed: false,
            type,
        };
        setActions([...actions, newAction]);
    };

    const generateDelayString = (): string => {
        if (formData.timingType === 'delay') {
            return `${formData.delayValue} ${formData.delayUnit} depois`;
        } else {
            return `${formData.specificDays} ${formData.specificDays === 1 ? 'dia' : 'dias'} após às ${formData.specificTime}`;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const stage: ScriptStage = {
            id: initialData?.id || Math.random().toString(36).substr(2, 9),
            title: formData.title,
            timing: {
                type: formData.timingType,
                delay: formData.timingType === 'delay' ? {
                    value: formData.delayValue,
                    unit: formData.delayUnit,
                } : undefined,
                specific: formData.timingType === 'specific' ? {
                    daysAfter: formData.specificDays,
                    time: formData.specificTime,
                } : undefined,
            },
            delay: generateDelayString(), // Para compatibilidade e display
            template: formData.template,
            autoSend: formData.autoSend,
            attachPdf: formData.attachPdf,
            requestMedia: formData.requestMedia,
            actions,
        };

        onSave(stage);
    };

    const tabs = [
        { id: 'basic' as const, label: 'Básico', icon: 'info' },
        { id: 'message' as const, label: 'Mensagem', icon: 'message' },
        { id: 'actions' as const, label: 'Ações', icon: 'checklist' },
        { id: 'settings' as const, label: 'Config', icon: 'settings' },
    ];

    const actionIcons: Record<ActionItem['type'], string> = {
        message: 'chat',
        photo_request: 'photo_camera',
        call: 'call',
        appointment: 'event',
        custom: 'star',
    };

    return (
        <div className="bg-white dark:bg-[#2d181e] rounded-xl border border-[#f3e7ea] dark:border-[#3d242a] shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#f3e7ea] dark:border-[#3d242a]">
                <div className="flex items-center gap-3">
                    <h3 className="text-[#1b0d11] dark:text-white text-lg font-bold">
                        {initialData ? 'Editar Estágio' : 'Novo Estágio'}
                    </h3>
                    {initialData?.type === 'service_survey' && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide border border-blue-200">
                            Pesquisa de Satisfação
                        </span>
                    )}
                    {initialData?.type === 'outcome_survey' && (
                        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wide border border-purple-200">
                            Pesquisa de Resultado
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#f3e7ea] dark:border-[#3d242a] px-6 overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-[#9a4c5f] hover:text-primary'
                            }`}
                    >
                        <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                        <span className="text-sm">{tab.label}</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-6">
                    {/* Tab: Básico */}
                    {activeTab === 'basic' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Input
                                label="Título do Estágio"
                                placeholder="Ex: Check-in 48h"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />

                            <div>
                                <label className="text-sm font-bold text-[#1b0d11] dark:text-white block mb-3">
                                    ⏱ Quando executar este estágio?
                                </label>

                                <div className="space-y-4">
                                    {/* Opção: Após intervalo */}
                                    <label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${formData.timingType === 'delay' ? 'border-primary bg-primary/5' : 'border-[#f3e7ea] dark:border-[#3d242a]'}">
                                        <input
                                            type="radio"
                                            name="timingType"
                                            checked={formData.timingType === 'delay'}
                                            onChange={() => setFormData({ ...formData, timingType: 'delay' })}
                                            className="mt-1 text-primary focus:ring-primary"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-[#1b0d11] dark:text-white mb-2">
                                                Após um intervalo
                                            </div>
                                            {formData.timingType === 'delay' && (
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={formData.delayValue}
                                                        onChange={e => setFormData({ ...formData, delayValue: parseInt(e.target.value) || 1 })}
                                                        className="w-20 rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-white dark:bg-[#3d242a] focus:ring-primary focus:border-primary px-3 py-2"
                                                    />
                                                    <select
                                                        value={formData.delayUnit}
                                                        onChange={e => setFormData({ ...formData, delayUnit: e.target.value as TimingUnit })}
                                                        className="rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-white dark:bg-[#3d242a] focus:ring-primary focus:border-primary px-3 py-2"
                                                    >
                                                        <option value={TimingUnit.MINUTES}>minutos</option>
                                                        <option value={TimingUnit.HOURS}>horas</option>
                                                        <option value={TimingUnit.DAYS}>dias</option>
                                                        <option value={TimingUnit.WEEKS}>semanas</option>
                                                    </select>
                                                    <span className="text-sm text-[#9a4c5f]">desde o procedimento</span>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    {/* Opção: Data/hora específica */}
                                    <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${formData.timingType === 'specific' ? 'border-primary bg-primary/5' : 'border-[#f3e7ea] dark:border-[#3d242a]'}`}>
                                        <input
                                            type="radio"
                                            name="timingType"
                                            checked={formData.timingType === 'specific'}
                                            onChange={() => setFormData({ ...formData, timingType: 'specific' })}
                                            className="mt-1 text-primary focus:ring-primary"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-[#1b0d11] dark:text-white mb-2">
                                                Em horário específico
                                            </div>
                                            {formData.timingType === 'specific' && (
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.specificDays}
                                                        onChange={e => setFormData({ ...formData, specificDays: parseInt(e.target.value) || 0 })}
                                                        className="w-20 rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-white dark:bg-[#3d242a] focus:ring-primary focus:border-primary px-3 py-2"
                                                    />
                                                    <span className="text-sm text-[#9a4c5f]">dias após às</span>
                                                    <input
                                                        type="time"
                                                        value={formData.specificTime}
                                                        onChange={e => setFormData({ ...formData, specificTime: e.target.value })}
                                                        className="rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-white dark:bg-[#3d242a] focus:ring-primary focus:border-primary px-3 py-2"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                                    <p className="text-xs text-[#9a4c5f]">
                                        <strong>Preview:</strong> {generateDelayString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Mensagem */}
                    {activeTab === 'message' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <label className="flex flex-col gap-2 w-full">
                                <span className="text-sm font-bold text-[#1b0d11] dark:text-white">Modelo de Mensagem WhatsApp</span>
                                <textarea
                                    className="rounded-xl border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary min-h-[200px] p-4 outline-none text-sm"
                                    placeholder="Olá #NomePaciente, tudo bem com você?..."
                                    value={formData.template}
                                    onChange={e => setFormData({ ...formData, template: e.target.value })}
                                    required
                                />
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, template: formData.template + '#NomePaciente' })}
                                        className="text-xs bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-3 py-1.5 rounded text-[#9a4c5f] hover:bg-primary hover:text-white transition-colors"
                                    >
                                        + #NomePaciente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, template: formData.template + '#NomeClinica' })}
                                        className="text-xs bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-3 py-1.5 rounded text-[#9a4c5f] hover:bg-primary hover:text-white transition-colors"
                                    >
                                        + #NomeClinica
                                    </button>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Tab: Ações */}
                    {activeTab === 'actions' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="text-sm font-bold text-[#1b0d11] dark:text-white block mb-3">
                                    Checklist de Ações
                                </label>
                                <p className="text-xs text-[#9a4c5f] mb-4">
                                    Defina as tarefas que devem ser executadas neste estágio do protocolo
                                </p>
                            </div>

                            {/* Lista de ações */}
                            <div className="space-y-2">
                                {actions.map(action => (
                                    <div
                                        key={action.id}
                                        className="flex items-center gap-3 p-3 bg-[#fff5f7] dark:bg-[#3d242a] rounded-lg group"
                                    >
                                        <span className="material-symbols-outlined text-primary text-lg">
                                            {actionIcons[action.type]}
                                        </span>
                                        <span className="flex-1 text-sm text-[#1b0d11] dark:text-white">
                                            {action.description}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAction(action.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9a4c5f] hover:text-red-500"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                ))}

                                {actions.length === 0 && (
                                    <div className="text-center py-8 text-[#9a4c5f] text-sm">
                                        Nenhuma ação adicionada ainda
                                    </div>
                                )}
                            </div>

                            {/* Ações pré-definidas */}
                            <div>
                                <p className="text-xs font-bold text-[#9a4c5f] uppercase tracking-wider mb-2">
                                    Adicionar ação rápida:
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleAddPredefinedAction('photo_request', 'Solicitar fotos de acompanhamento')}
                                        className="text-xs bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-3 py-2 rounded-lg text-[#9a4c5f] hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                                        Solicitar Foto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAddPredefinedAction('call', 'Ligar para verificar recuperação')}
                                        className="text-xs bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-3 py-2 rounded-lg text-[#9a4c5f] hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">call</span>
                                        Ligar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAddPredefinedAction('appointment', 'Agendar retorno presencial')}
                                        className="text-xs bg-white dark:bg-[#3a2228] border border-[#f3e7ea] dark:border-[#3a2228] px-3 py-2 rounded-lg text-[#9a4c5f] hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">event</span>
                                        Agendar Retorno
                                    </button>
                                </div>
                            </div>

                            {/* Adicionar ação personalizada */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Digite uma ação personalizada..."
                                    value={newActionText}
                                    onChange={e => setNewActionText(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddAction())}
                                    className="flex-1 rounded-lg border-[#e7cfd5] dark:border-[#4d3239] bg-white dark:bg-[#3d242a] focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddAction}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab: Configurações */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="text-sm font-bold text-[#1b0d11] dark:text-white block mb-3">
                                    Configurações de Envio
                                </label>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-start gap-3 p-4 border border-[#f3e7ea] dark:border-[#3d242a] rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-primary focus:ring-primary border-gray-300"
                                        checked={formData.autoSend}
                                        onChange={e => setFormData({ ...formData, autoSend: e.target.checked })}
                                    />
                                    <div>
                                        <div className="font-bold text-[#1b0d11] dark:text-white">Envio Automático</div>
                                        <div className="text-xs text-[#9a4c5f] mt-1">
                                            A mensagem será enviada automaticamente no horário programado
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-4 border border-[#f3e7ea] dark:border-[#3d242a] rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-primary focus:ring-primary border-gray-300"
                                        checked={formData.attachPdf}
                                        onChange={e => setFormData({ ...formData, attachPdf: e.target.checked })}
                                    />
                                    <div>
                                        <div className="font-bold text-[#1b0d11] dark:text-white">Anexar PDF</div>
                                        <div className="text-xs text-[#9a4c5f] mt-1">
                                            Anexar guia de cuidados pós-operatórios em PDF
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-4 border border-[#f3e7ea] dark:border-[#3d242a] rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded text-primary focus:ring-primary border-gray-300"
                                        checked={formData.requestMedia}
                                        onChange={e => setFormData({ ...formData, requestMedia: e.target.checked })}
                                    />
                                    <div>
                                        <div className="font-bold text-[#1b0d11] dark:text-white">Solicitar Foto</div>
                                        <div className="text-xs text-[#9a4c5f] mt-1">
                                            Solicitar que o paciente envie foto de resposta
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer com botões */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#f3e7ea] dark:border-[#3d242a] bg-[#fff5f7]/30 dark:bg-[#3d242a]/30">
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary">
                        Salvar Estágio
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default StageEditor;
