import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { Campaign, CampaignStage } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ScriptStage, TimingUnit } from '../types';
import StageEditor from './StageEditor';
import { QuizEditor, Question } from './QuizEditor';
import { toast } from 'react-hot-toast';

interface CampaignManagerProps {
    onClose: () => void;
}

export function CampaignManager({ onClose }: CampaignManagerProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [stages, setStages] = useState<CampaignStage[]>([]);
    const [loadingStages, setLoadingStages] = useState(false);
    const [activeTab, setActiveTab] = useState<'stages' | 'quiz' | 'followup'>('stages');

    // Form states
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    // Follow-up Editor states
    const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
    const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        if (selectedCampaign) {
            fetchStages(selectedCampaign.id);
            setActiveTab('stages');
        } else {
            setStages([]);
        }
    }, [selectedCampaign]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('name');

            if (error) throw error;
            setCampaigns(data || []);
        } catch (error) {
            console.error('Erro ao buscar campanhas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStages = async (campaignId: string) => {
        setLoadingStages(true);
        try {
            const { data, error } = await supabase
                .from('campaign_stages')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('position');

            if (error) throw error;
            setStages(data || []);
        } catch (error) {
            console.error('Erro ao buscar estágios:', error);
        } finally {
            setLoadingStages(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!editName.trim()) return;
        try {
            // Get clinic_id from profile (assuming auth user has one)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            if (!profile?.clinic_id) {
                alert('Erro: Usuário não vinculado a uma clínica.');
                return;
            }

            const { data, error } = await supabase
                .from('campaigns')
                .insert([{
                    name: editName,
                    description: editDesc,
                    clinic_id: profile.clinic_id,
                    is_active: true
                }])
                .select()
                .single();

            if (error) throw error;

            setCampaigns([...campaigns, data]);
            setEditName('');
            setEditDesc('');
            setIsEditing(false);
        } catch (error: any) {
            console.error('Erro ao criar campanha:', error);
            if (error?.code === 'PGRST205' || error?.code === '42P01' || error?.message?.includes('relation "campaigns" does not exist')) {
                alert('Erro: A tabela "campaigns" não foi encontrada. \n\nPOR FAVOR, EXECUTE O SCRIPT DE MIGRAÇÃO NO SUPABASE.\n\nConsulte o guia de migração.');
            } else {
                alert(`Erro ao criar campanha: ${error.message || 'Erro desconhecido'}`);
            }
        }
    };

    const handleUpdateCampaign = async () => {
        if (!selectedCampaign || !editName.trim()) return;
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update({ name: editName, description: editDesc })
                .eq('id', selectedCampaign.id)
                .select()
                .single();

            if (error) throw error;

            setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? data : c));
            setSelectedCampaign(data);
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao atualizar campanha:', error);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm('Tem certeza? Todos os negócios nesta campanha ficarão órfãos de campanha (mas manterão histórico).')) return;
        try {
            const { error } = await supabase.from('campaigns').delete().eq('id', id);
            if (error) throw error;
            setCampaigns(campaigns.filter(c => c.id !== id));
            if (selectedCampaign?.id === id) setSelectedCampaign(null);
        } catch (error) {
            console.error('Erro ao deletar campanha:', error);
        }
    };

    const handleAddStage = async () => {
        if (!selectedCampaign) return;
        const title = prompt('Nome do novo estágio:');
        if (!title) return;

        try {
            const newPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 1;
            const { data, error } = await supabase.from('campaign_stages').insert([{
                campaign_id: selectedCampaign.id,
                title,
                position: newPosition,
                color: '#CBD5E1' // default gray
            }]).select().single();

            if (error) throw error;
            setStages([...stages, data]);
        } catch (error) {
            console.error('Erro ao adicionar estágio:', error);
        }
    };

    const handleUpdateStage = async (stage: CampaignStage) => {
        const newTitle = prompt('Novo nome do estágio:', stage.title);
        if (newTitle === null) return; // Cancelled

        try {
            const { data, error } = await supabase.from('campaign_stages')
                .update({ title: newTitle })
                .eq('id', stage.id)
                .select()
                .single();
            if (error) throw error;
            setStages(stages.map(s => s.id === stage.id ? data : s));
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteStage = async (id: string) => {
        if (!confirm('Excluir estágio? Negócios neste estágio ficarão sem estágio visualizável.')) return;
        try {
            await supabase.from('campaign_stages').delete().eq('id', id);
            setStages(stages.filter(s => s.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const onDragEnd = async (result: any) => {
        if (!result.destination) return;
        const items = Array.from(stages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Optimistic update
        setStages(items);

        // Update positions in DB
        try {
            const updates = items.map((item, index) => ({
                id: item.id,
                position: index + 1
            }));

            for (const update of updates) {
                await supabase.from('campaign_stages').update({ position: update.position }).eq('id', update.id);
            }
        } catch (e) {
            console.error('Erro ao reordenar:', e);
            fetchStages(selectedCampaign!.id); // revert on error
        }
    };

    const handleSaveQuizConfig = async (questions: Question[], finalScreen: any) => {
        if (!selectedCampaign) return;
        try {
            const quizConfig = { questions, final_screen: finalScreen };
            const { data, error } = await supabase
                .from('campaigns')
                .update({ quiz_config: quizConfig, external_quiz_url: null }) // Clear external URL if using custom quiz
                .eq('id', selectedCampaign.id)
                .select()
                .single();

            if (error) throw error;

            setSelectedCampaign(data);
            setCampaigns(campaigns.map(c => c.id === data.id ? data : c));
            alert('Quiz da campanha salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar quiz:', error);
            alert('Erro ao salvar configurações do quiz.');
        }
    };

    const handleSaveExternalUrl = async (url: string) => {
        if (!selectedCampaign) return;
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update({ external_quiz_url: url, quiz_config: null }) // Clear custom config if using external URL? Or keep it? Let's clear to be explicit about mode.
                .eq('id', selectedCampaign.id)
                .select()
                .single();

            if (error) throw error;

            setSelectedCampaign(data);
            setCampaigns(campaigns.map(c => c.id === data.id ? data : c));
            console.log('External URL saved');
        } catch (error) {
            console.error('Erro ao salvar URL externa:', error);
            alert('Erro ao salvar URL externa.');
        }
    };

    const handleSaveFollowUpStage = async (stage: ScriptStage) => {
        if (!selectedCampaign) return;
        const currentStages = selectedCampaign.followup_config || [];

        let newStages;
        if (stage.id && currentStages.some(s => s.id === stage.id)) {
            // Update
            newStages = currentStages.map(s => s.id === stage.id ? stage : s);
        } else {
            // Add
            newStages = [...currentStages, stage];
        }

        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update({ followup_config: newStages })
                .eq('id', selectedCampaign.id)
                .select()
                .single();

            if (error) throw error;

            setSelectedCampaign(data);
            setCampaigns(campaigns.map(c => c.id === data.id ? data : c));
            setEditingFollowUpId(null);
            setIsAddingFollowUp(false);

            // Toast de sucesso
            toast.success('Estágio salvo com sucesso!', {
                duration: 3000,
                position: 'top-right',
                style: {
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 'bold',
                },
                icon: '✓',
            });
        } catch (error) {
            console.error('Erro ao salvar estágio de acompanhamento:', error);
            toast.error('Erro ao salvar estágio.', {
                duration: 3000,
                position: 'top-right',
            });
        }
    };

    const handleDeleteFollowUpStage = async (stageId: string) => {
        if (!selectedCampaign || !confirm('Tem certeza que deseja excluir este estágio de acompanhamento?')) return;

        const newStages = (selectedCampaign.followup_config || []).filter(s => s.id !== stageId);

        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update({ followup_config: newStages })
                .eq('id', selectedCampaign.id)
                .select()
                .single();

            if (error) throw error;

            setSelectedCampaign(data);
            setCampaigns(campaigns.map(c => c.id === data.id ? data : c));
        } catch (error) {
            console.error('Erro ao excluir estágio:', error);
            alert('Erro ao excluir estágio.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl h-[85vh] flex overflow-hidden shadow-xl">

                {/* Sidebar: Campaign List */}
                <div className="w-1/4 min-w-[250px] border-r bg-gray-50 flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0">
                        <h2 className="font-bold text-gray-800">Campanhas</h2>
                        <button
                            onClick={() => {
                                setSelectedCampaign(null);
                                setEditName('');
                                setEditDesc('');
                                setIsEditing(true);
                            }}
                            className="p-1 hover:bg-gray-200 rounded text-blue-600"
                            title="Nova Campanha"
                        >
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">Carregando...</div>
                        ) : (
                            campaigns.map(campaign => (
                                <div
                                    key={campaign.id}
                                    onClick={() => {
                                        setSelectedCampaign(campaign);
                                        setIsEditing(false);
                                    }}
                                    className={`p-3 rounded-md cursor-pointer border transition-colors ${selectedCampaign?.id === campaign.id
                                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                                        : 'bg-white border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-medium text-gray-800">{campaign.name}</h3>
                                        {selectedCampaign?.id === campaign.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditName(campaign.name);
                                                    setEditDesc(campaign.description || '');
                                                    setIsEditing(true);
                                                }}
                                                className="text-gray-400 hover:text-blue-500"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                        )}
                                    </div>
                                    {campaign.description && (
                                        <p className="text-xs text-gray-500 mt-1 truncate">{campaign.description}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center shrink-0">
                        {isEditing ? (
                            <div className="flex-1 flex gap-2">
                                <input
                                    className="border rounded px-2 py-1 flex-1"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="Nome da Campanha"
                                />
                                <input
                                    className="border rounded px-2 py-1 flex-1"
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    placeholder="Descrição (opcional)"
                                />
                                <button onClick={selectedCampaign ? handleUpdateCampaign : handleCreateCampaign} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"> Salvar </button>
                                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700 px-2"> Cancelar </button>
                            </div>
                        ) : (
                            <>
                                <h2 className="font-bold text-xl text-gray-800 truncate">
                                    {selectedCampaign ? selectedCampaign.name : 'Selecione ou crie uma campanha'}
                                </h2>
                                <div className="flex gap-2">
                                    {selectedCampaign && (
                                        <button onClick={() => handleDeleteCampaign(selectedCampaign.id)} className="text-red-500 hover:bg-red-50 p-2 rounded" title="Excluir Campanha">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    )}
                                    <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-2 rounded">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {selectedCampaign ? (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b bg-gray-50 px-6 pt-2 shrink-0">
                                <button
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stages'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    onClick={() => setActiveTab('stages')}
                                >
                                    Estágios do Pipeline
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'quiz'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    onClick={() => setActiveTab('quiz')}
                                >
                                    Configuração do Quiz
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'followup'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    onClick={() => setActiveTab('followup')}
                                >
                                    Config. Acompanhamento
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-hidden bg-white">
                                {activeTab === 'stages' && (
                                    <div className="h-full overflow-y-auto p-6 bg-gray-50">
                                        <div className="max-w-2xl mx-auto">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-semibold text-gray-700">Fluxo do Kanban</h3>
                                                <button onClick={handleAddStage} className="text-sm bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-1 shadow-sm">
                                                    <span className="material-symbols-outlined text-sm">add</span> Adicionar Estágio
                                                </button>
                                            </div>

                                            {loadingStages ? (
                                                <p className="text-gray-500">Carregando estágios...</p>
                                            ) : (
                                                <DragDropContext onDragEnd={onDragEnd}>
                                                    <Droppable droppableId="stages">
                                                        {(provided) => (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className="space-y-2"
                                                            >
                                                                {stages.map((stage, index) => (
                                                                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                                                        {(provided) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-3 group"
                                                                            >
                                                                                <div {...provided.dragHandleProps} className="text-gray-400 cursor-move">
                                                                                    <span className="material-symbols-outlined">drag_indicator</span>
                                                                                </div>
                                                                                <div className="flex-1 font-medium text-gray-700">
                                                                                    {stage.title}
                                                                                </div>
                                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button onClick={() => handleUpdateStage(stage)} className="p-1 hover:text-blue-600">
                                                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                                                    </button>
                                                                                    <button onClick={() => handleDeleteStage(stage.id)} className="p-1 hover:text-red-600">
                                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </DragDropContext>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'quiz' && (
                                    <div className="h-full flex flex-col">
                                        <div className="p-6 pb-2">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                                <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-lg">link</span> Link do Quiz desta Campanha
                                                </h4>
                                                <div className="flex gap-2">
                                                    <code className="flex-1 bg-white border border-blue-200 px-3 py-2 rounded text-sm text-gray-600 font-mono">
                                                        {`${window.location.origin}/quiz?campaign=${selectedCampaign.id}`}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/quiz?campaign=${selectedCampaign.id}`);
                                                            alert('Link copiado!');
                                                        }}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                                    >
                                                        Copiar
                                                    </button>
                                                    <a
                                                        href={`/quiz?campaign=${selectedCampaign.id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center"
                                                    >
                                                        Testar <span className="material-symbols-outlined text-sm ml-1">open_in_new</span>
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="quizType"
                                                        checked={!selectedCampaign.external_quiz_url}
                                                        onChange={() => handleSaveExternalUrl('')}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="font-medium text-gray-700">Quiz Personalizado (Editor)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="quizType"
                                                        checked={!!selectedCampaign.external_quiz_url}
                                                        onChange={() => {
                                                            // Just switch UI, valid URL save happens on blur/enter or direct update
                                                            // actually we need to set state to show input, but input is controlled by campaign data
                                                            // so we just trigger a state update via handleSaveExternalUrl with current or empty
                                                            if (!selectedCampaign.external_quiz_url) handleSaveExternalUrl('https://');
                                                        }}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="font-medium text-gray-700">Link Externo (Typeform, etc)</span>
                                                </label>
                                            </div>
                                        </div>

                                        {selectedCampaign.external_quiz_url ? (
                                            <div className="p-6 pt-0">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">URL do Quiz Externo</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={selectedCampaign.external_quiz_url}
                                                        onChange={(e) => {
                                                            // Optimistic local update for typing
                                                            setSelectedCampaign({ ...selectedCampaign, external_quiz_url: e.target.value });
                                                        }}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== selectedCampaign.external_quiz_url) {
                                                                handleSaveExternalUrl(e.target.value);
                                                            } else {
                                                                handleSaveExternalUrl(e.target.value);
                                                            }
                                                        }}
                                                        placeholder="https://form.typeform.com/..."
                                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveExternalUrl(selectedCampaign.external_quiz_url || '')}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    Ao usar um link externo, o botão "Novo Negócio" ou links enviados aos leads irão redirecionar para esta URL.
                                                    Certifique-se de configurar o webhook do seu formulário para enviar os dados para o CRM.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-hidden">
                                                <QuizEditor
                                                    initialQuestions={selectedCampaign.quiz_config?.questions}
                                                    initialFinalScreen={selectedCampaign.quiz_config?.final_screen}
                                                    onSave={handleSaveQuizConfig}
                                                    title="Editor de Quiz da Campanha"
                                                    description={`Personalize o quiz específico para a campanha "${selectedCampaign.name}"`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'followup' && (
                                    <div className="h-full overflow-y-auto p-6 bg-gray-50">
                                        {!isAddingFollowUp && !editingFollowUpId ? (
                                            <div className="max-w-4xl mx-auto">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-lg font-bold text-gray-800">Estágios de Acompanhamento</h3>
                                                    <button
                                                        onClick={() => setIsAddingFollowUp(true)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                                    >
                                                        <span className="material-symbols-outlined">add</span>
                                                        Adicionar Estágio
                                                    </button>
                                                </div>

                                                {(selectedCampaign.followup_config || []).length === 0 ? (
                                                    <div className="text-center py-12 text-gray-500">
                                                        <span className="material-symbols-outlined text-6xl mb-4 block">event_note</span>
                                                        <p>Nenhum estágio de acompanhamento configurado.</p>
                                                        <p className="text-sm mt-2">Clique em "Adicionar Estágio" para começar.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {(selectedCampaign.followup_config || []).map((stage, idx) => (
                                                            <div
                                                                key={stage.id}
                                                                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-bold text-gray-800 mb-1">{stage.title}</h4>
                                                                        <p className="text-sm text-gray-600 mb-2">
                                                                            <span className="material-symbols-outlined text-xs align-middle">schedule</span>
                                                                            {' '}{stage.delay || `${stage.timing?.delay?.value} ${stage.timing?.delay?.unit}`}
                                                                        </p>
                                                                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                                                            {stage.template.substring(0, 100)}{stage.template.length > 100 ? '...' : ''}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-2 ml-4">
                                                                        <button
                                                                            onClick={() => setEditingFollowUpId(stage.id)}
                                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                            title="Editar"
                                                                        >
                                                                            <span className="material-symbols-outlined">edit</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteFollowUpStage(stage.id)}
                                                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                            title="Excluir"
                                                                        >
                                                                            <span className="material-symbols-outlined">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="max-w-4xl mx-auto">
                                                <StageEditor
                                                    initialData={editingFollowUpId ? (selectedCampaign.followup_config || []).find(s => s.id === editingFollowUpId) : undefined}
                                                    onSave={handleSaveFollowUpStage}
                                                    onCancel={() => {
                                                        setEditingFollowUpId(null);
                                                        setIsAddingFollowUp(false);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
                            <span className="material-symbols-outlined text-6xl mb-4">campaign</span>
                            <p>Selecione uma campanha para gerenciar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
