import React, { useState, useEffect, useRef } from 'react';
import { Negocio, AtividadeNegocio, MotivoPerda } from '../types';
import { negociosService } from '../src/services/negociosService';
import { whatsappService } from '../src/services/whatsappService';

interface NegocioDetailsModalProps {
    negocio: Negocio;
    onClose: () => void;
    onUpdate: () => void;
}

export function NegocioDetailsModal({ negocio, onClose, onUpdate }: NegocioDetailsModalProps) {
    const [atividades, setAtividades] = useState<AtividadeNegocio[]>([]);
    const [loadingAtividades, setLoadingAtividades] = useState(true);
    const [showLossForm, setShowLossForm] = useState(false);
    const [motivoPerda, setMotivoPerda] = useState<MotivoPerda>('sem_interesse');
    const [detalhesPerda, setDetalhesPerda] = useState('');
    const [nota, setNota] = useState('');
    const [dataAgendamento, setDataAgendamento] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'whatsapp'>('details');
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([
        { id: 1, text: 'Olá, sou o Rodrigo! Em que posso ajudar?', sender: 'lead', time: '10:30' },
        { id: 2, text: 'Oi Rodrigo! Recebi seu contato. Gostaria de saber mais sobre os procedimentos de Harmonização Facial.', sender: 'clinic', time: '10:32' },
        { id: 3, text: 'Claro! Vou enviar nossa tabela de valores e as datas disponíveis.', sender: 'clinic', time: '10:33' },
    ]);

    useEffect(() => {
        loadAtividades();
    }, [negocio.id]);

    const loadAtividades = async () => {
        try {
            setLoadingAtividades(true);
            const data = await negociosService.buscarAtividades(negocio.id);
            setAtividades(data);
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
        } finally {
            setLoadingAtividades(false);
        }
    };

    const handleAddContactAttempt = async () => {
        try {
            await negociosService.registrarTentativaContato(negocio.id);
            if (nota) {
                await negociosService.registrarAtividade(
                    negocio.id,
                    'nota',
                    nota
                );
            }
            setNota('');
            await loadAtividades();
            onUpdate();
        } catch (error) {
            console.error('Erro ao adicionar tentativa:', error);
            alert('Erro ao adicionar tentativa de contrato');
        }
    };

    const handleMarkAsLost = async () => {
        if (!motivoPerda) {
            alert('Selecione um motivo de perda');
            return;
        }

        try {
            await negociosService.marcarComoPerdido(negocio.id, motivoPerda, detalhesPerda);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Erro ao marcar como perdido:', error);
            alert('Erro ao marcar negócio como perdido');
        }
    };

    const handleScheduleConsultation = async () => {
        if (!dataAgendamento) {
            alert('Selecione uma data e hora');
            return;
        }

        try {
            await negociosService.atualizarAgendamento(negocio.id, dataAgendamento, false);
            await loadAtividades();
            onUpdate();
            setDataAgendamento('');
        } catch (error) {
            console.error('Erro ao agendar:', error);
            alert('Erro ao agendar consulta');
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const msgTexto = newMessage;
        setNewMessage('');

        const msg = {
            id: Date.now(),
            text: msgTexto,
            sender: 'clinic',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, msg]);

        try {
            await whatsappService.sendMessage({
                negocioId: negocio.id,
                to: negocio.lead?.whatsapp || '',
                text: msgTexto,
                type: 'text'
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem real:', error);
            // Poderia adicionar um indicador de erro na mensagem
        }
    };

    const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !negocio.lead?.whatsapp) return;

        const msg = {
            id: Date.now(),
            text: `📁 Arquivo: ${file.name}`,
            sender: 'clinic',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: 'file' as const
        };

        setChatMessages(prev => [...prev, msg]);

        try {
            await whatsappService.sendFile(negocio.id, negocio.lead.whatsapp, file);
        } catch (error) {
            console.error('Erro ao enviar arquivo real:', error);
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getEstagioLabel = (estagio: string): string => {
        const labels: Record<string, string> = {
            lead_quiz: 'Lead Quiz',
            em_atendimento: 'Em Atendimento',
            qualificado: 'Qualificado',
            oferta_consulta: 'Oferta de Consulta',
            consulta_aceita: 'Consulta Aceita',
            consulta_paga: 'Consulta Paga',
            ganho: 'Ganho',
            consulta_realizada: 'Consulta Realizada',
            perdido: 'Perdido'
        };
        return labels[estagio] || estagio;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2>{negocio.lead?.name || 'Negócio'}</h2>
                        <p className="subtitle">
                            {getEstagioLabel(negocio.estagio)}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <span className="material-symbols-outlined">info</span>
                        Detalhes & Ações
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
                        onClick={() => setActiveTab('whatsapp')}
                    >
                        <span className="material-symbols-outlined">chat</span>
                        WhatsApp
                    </button>
                </div>

                <div className="modal-body custom-scrollbar">
                    {activeTab === 'details' ? (
                        <>
                            {/* Info Section */}
                            <div className="info-section">
                                <div className="info-row">
                                    <span className="label"><span className="material-symbols-outlined icon-sm">smartphone</span> WhatsApp:</span>
                                    <span className="value">{negocio.lead?.whatsapp || 'N/A'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label"><span className="material-symbols-outlined icon-sm">payments</span> Valor da Consulta:</span>
                                    <span className="value">{formatCurrency(negocio.valor_consulta)}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label"><span className="material-symbols-outlined icon-sm">call</span> Tentativas de Contato:</span>
                                    <span className="value">{negocio.tentativas_contato}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label"><span className="material-symbols-outlined icon-sm">schedule</span> Criado em:</span>
                                    <span className="value">{formatDateTime(negocio.criado_em)}</span>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="actions-section">
                                <h3>Ações Rápidas</h3>

                                {/* Registrar Tentativa */}
                                <div className="action-card">
                                    <label>Registrar Tentativa de Contato</label>
                                    <textarea
                                        value={nota}
                                        onChange={(e) => setNota(e.target.value)}
                                        placeholder="Adicionar nota (opcional)..."
                                        rows={2}
                                    />
                                    <button onClick={handleAddContactAttempt} className="btn-primary">
                                        <span className="material-symbols-outlined icon-sm">call</span> Registrar Tentativa
                                    </button>
                                </div>

                                {/* Agendar Consulta */}
                                <div className="action-card">
                                    <label>Agendar Consulta</label>
                                    <input
                                        type="datetime-local"
                                        value={dataAgendamento}
                                        onChange={(e) => setDataAgendamento(e.target.value)}
                                    />
                                    <button onClick={handleScheduleConsultation} className="btn-primary">
                                        <span className="material-symbols-outlined icon-sm">calendar_today</span> Agendar
                                    </button>
                                </div>

                                {/* Marcar como Perdido */}
                                {!showLossForm ? (
                                    <button
                                        onClick={() => setShowLossForm(true)}
                                        className="btn-danger"
                                    >
                                        <span className="material-symbols-outlined icon-sm">cancel</span> Marcar como Perdido
                                    </button>
                                ) : (
                                    <div className="action-card loss-form">
                                        <label>Motivo da Perda</label>
                                        <select
                                            value={motivoPerda}
                                            onChange={(e) => setMotivoPerda(e.target.value as MotivoPerda)}
                                            aria-label="Motivo da perda"
                                        >
                                            <option value="bloqueou">Bloqueou</option>
                                            <option value="sem_interesse">Sem Interesse</option>
                                            <option value="nao_respondeu">Não Respondeu</option>
                                            <option value="objecao_preco">Objeção de Preço</option>
                                            <option value="objecao_tempo">Objeção de Tempo</option>
                                            <option value="concorrente">Foi para Concorrente</option>
                                            <option value="nao_pode_pagar">Não Pode Pagar</option>
                                        </select>
                                        <textarea
                                            value={detalhesPerda}
                                            onChange={(e) => setDetalhesPerda(e.target.value)}
                                            placeholder="Detalhes adicionais (opcional)..."
                                            rows={2}
                                        />
                                        <div className="btn-group">
                                            <button onClick={() => setShowLossForm(false)} className="btn-secondary">
                                                Cancelar
                                            </button>
                                            <button onClick={handleMarkAsLost} className="btn-danger">
                                                Confirmar Perda
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="timeline-section">
                                <h3>Histórico de Atividades</h3>
                                {loadingAtividades ? (
                                    <p className="loading-text">Carregando...</p>
                                ) : atividades.length === 0 ? (
                                    <p className="empty-text">Nenhuma atividade registrada</p>
                                ) : (
                                    <div className="timeline">
                                        {atividades.map((atividade) => (
                                            <div key={atividade.id} className="timeline-item">
                                                <div className="timeline-marker" />
                                                <div className="timeline-content">
                                                    <div className="timeline-header">
                                                        <span className="timeline-type">
                                                            {atividade.tipo_atividade.replace('_', ' ')}
                                                        </span>
                                                        <span className="timeline-date">
                                                            {formatDateTime(atividade.criado_em)}
                                                        </span>
                                                    </div>
                                                    <p className="timeline-description">{atividade.descricao}</p>
                                                    {atividade.nome_usuario && (
                                                        <span className="timeline-user">
                                                            Por: {atividade.nome_usuario}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="whatsapp-container">
                            <div className="chat-header">
                                <div className="chat-info">
                                    <div className="chat-avatar">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <h4>{negocio.lead?.name}</h4>
                                        <p><span className="status-dot"></span> Online</p>
                                    </div>
                                </div>
                                <div className="chat-actions">
                                    <span className="material-symbols-outlined">more_vert</span>
                                </div>
                            </div>

                            <div className="chat-messages custom-scrollbar">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`message-bubble ${msg.sender} ${msg.type === 'file' ? 'file-msg' : ''}`}>
                                        {msg.type === 'file' ? (
                                            <div className="file-content">
                                                <span className="material-symbols-outlined">description</span>
                                                <span>{msg.text}</span>
                                            </div>
                                        ) : (
                                            <p>{msg.text}</p>
                                        )}
                                        <span className="message-time">{msg.time} {msg.sender === 'clinic' && <span className="material-symbols-outlined check">done_all</span>}</span>
                                    </div>
                                ))}
                                <div className="encryption-notice">
                                    <span className="material-symbols-outlined">lock</span>
                                    As mensagens são protegidas por criptografia de ponta a ponta.
                                </div>
                            </div>

                            <div className="chat-input-area">
                                <div className="input-wrapper">
                                    <div className="emoji-container">
                                        <span className="material-symbols-outlined emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>mood</span>
                                        {showEmojiPicker && (
                                            <div className="emoji-picker-mock">
                                                {['😊', '👍', '❤️', '📅', '🏥', '✨', '🙏', '✅'].map(emoji => (
                                                    <span key={emoji} onClick={() => addEmoji(emoji)}>{emoji}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Mensagem"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleFileAttach}
                                    />
                                    <span
                                        className="material-symbols-outlined attach-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        attach_file
                                    </span>
                                </div>
                                <button className="send-btn" onClick={handleSendMessage}>
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <style jsx>{`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 2rem;
                    }

                    .modal-content {
                        background: white;
                        border-radius: 1rem;
                        max-width: 700px;
                        width: 100%;
                        max-height: 90vh;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding: 1.5rem;
                        border-bottom: 1px solid #E5E7EB;
                    }

                    .modal-header h2 {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #111827;
                        margin: 0 0 0.25rem 0;
                    }

                    .subtitle {
                        font-size: 0.875rem;
                        color: #6B7280;
                        margin: 0;
                    }

                    .close-btn {
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: #9CA3AF;
                        cursor: pointer;
                        padding: 0;
                        width: 2rem;
                        height: 2rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 0.5rem;
                        transition: all 0.2s;
                    }

                    .close-btn:hover {
                        background: #F3F4F6;
                        color: #111827;
                    }

                    .modal-tabs {
                        display: flex;
                        background: #F9FAFB;
                        border-bottom: 1px solid #E5E7EB;
                        padding: 0 1rem;
                    }

                    .tab-btn {
                        padding: 1rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        background: none;
                        border: none;
                        border-bottom: 2px solid transparent;
                        color: #6B7280;
                        font-weight: 600;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .tab-btn:hover {
                        color: #111827;
                        background: transparent;
                    }

                    .tab-btn.active {
                        border-bottom-color: #9a4c5f;
                        color: #9a4c5f;
                        background: white;
                    }

                    .modal-body {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1.5rem;
                        background: #fff;
                    }

                    .info-section {
                        background: #F9FAFB;
                        border-radius: 0.75rem;
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                    }

                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #E5E7EB;
                    }

                    .info-row:last-child {
                        border-bottom: none;
                    }

                    .info-row .label {
                        font-weight: 600;
                        color: #374151;
                        font-size: 0.875rem;
                    }

                    .info-row .value {
                        color: #6B7280;
                        font-size: 0.875rem;
                    }

                    .actions-section h3,
                    .timeline-section h3 {
                        font-size: 1.125rem;
                        font-weight: 700;
                        color: #111827;
                        margin: 0 0 1rem 0;
                    }

                    .action-card {
                        background: white;
                        border: 1px solid #E5E7EB;
                        border-radius: 0.75rem;
                        padding: 1rem;
                        margin-bottom: 1rem;
                    }

                    .action-card label {
                        display: block;
                        font-weight: 600;
                        font-size: 0.875rem;
                        color: #374151;
                        margin-bottom: 0.5rem;
                    }

                    .action-card input,
                    .action-card textarea,
                    .action-card select {
                        width: 100%;
                        padding: 0.625rem;
                        border: 1px solid #D1D5DB;
                        border-radius: 0.5rem;
                        font-size: 0.875rem;
                        font-family: inherit;
                        margin-bottom: 0.75rem;
                    }

                    .action-card textarea {
                        resize: vertical;
                    }

                    .btn-primary,
                    .btn-secondary,
                    .btn-danger {
                        width: 100%;
                        padding: 0.75rem;
                        border-radius: 0.5rem;
                        font-weight: 600;
                        font-size: 0.875rem;
                        cursor: pointer;
                        border: none;
                        transition: all 0.2s;
                    }

                    .btn-primary {
                        background: linear-gradient(135deg, #9a4c5f 0%, #c27ba0 100%);
                        color: white;
                    }

                    .btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(154, 76, 95, 0.3);
                    }

                    .btn-danger {
                        background: #EF4444;
                        color: white;
                    }

                    .btn-danger:hover {
                        background: #DC2626;
                    }

                    .btn-secondary {
                        background: white;
                        border: 1px solid #D1D5DB;
                        color: #374151;
                    }

                    .btn-group {
                        display: flex;
                        gap: 0.75rem;
                    }

                    .timeline {
                        position: relative;
                    }

                    .timeline-item {
                        display: flex;
                        gap: flex;
                        margin-bottom: 1rem;
                        position: relative;
                        padding-left: 2rem;
                    }

                    .timeline-marker {
                        position: absolute;
                        left: 0;
                        top: 0.5rem;
                        width: 0.75rem;
                        height: 0.75rem;
                        background: #9a4c5f;
                        border-radius: 50%;
                    }

                    .timeline-item:not(:last-child) .timeline-marker::after {
                        content: '';
                        position: absolute;
                        left: 50%;
                        top: 100%;
                        transform: translateX(-50%);
                        width: 2px;
                        height: 2rem;
                        background: #E5E7EB;
                    }

                    .timeline-content {
                        flex: 1;
                        background: #F9FAFB;
                        padding: 0.75rem;
                        border-radius: 0.5rem;
                    }

                    .timeline-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 0.5rem;
                    }

                    .timeline-type {
                        font-weight: 600;
                        font-size: 0.813rem;
                        color: #111827;
                        text-transform: capitalize;
                    }

                    .timeline-date {
                        font-size: 0.75rem;
                        color: #9CA3AF;
                    }

                    .timeline-description {
                        font-size: 0.875rem;
                        color: #374151;
                        margin: 0 0 0.5rem 0;
                    }

                    .timeline-user {
                        font-size: 0.75rem;
                        color: #6B7280;
                        font-style: italic;
                    }

                    .loading-text,
                    .empty-text {
                        text-align: center;
                        color: #9CA3AF;
                        padding: 2rem;
                        font-size: 0.875rem;
                    }

                    .icon-sm {
                        font-size: 1rem;
                        vertical-align: text-bottom;
                        margin-right: 0.25rem;
                    }

                    /* WhatsApp Styles */
                    .whatsapp-container {
                        height: 500px;
                        display: flex;
                        flex-direction: column;
                        background: #e5ddd5;
                        border-radius: 0.75rem;
                        overflow: hidden;
                        border: 1px solid #E5E7EB;
                        position: relative;
                    }

                    .whatsapp-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
                        background-repeat: repeat;
                        opacity: 0.06;
                        pointer-events: none;
                    }

                    .chat-header {
                        padding: 0.75rem 1rem;
                        background: #075e54;
                        color: white;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        z-index: 10;
                    }

                    .chat-info {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                    }

                    .chat-avatar {
                        width: 40px;
                        height: 40px;
                        background: #E5E7EB;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #6B7280;
                    }

                    .chat-info h4 {
                        margin: 0;
                        font-size: 1rem;
                        font-weight: 600;
                    }

                    .chat-info p {
                        margin: 0;
                        font-size: 0.75rem;
                        opacity: 0.8;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }

                    .status-dot {
                        width: 8px;
                        height: 8px;
                        background: #4ADE80;
                        border-radius: 50%;
                    }

                    .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem;
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        z-index: 10;
                    }

                    .message-bubble {
                        max-width: 80%;
                        padding: 0.5rem 0.75rem;
                        border-radius: 0.5rem;
                        font-size: 0.875rem;
                        position: relative;
                        box-shadow: 0 1px 1px rgba(0,0,0,0.1);
                        line-height: 1.4;
                    }

                    .message-bubble.lead {
                        align-self: flex-start;
                        background: white;
                        color: #111827;
                    }

                    .message-bubble.clinic {
                        align-self: flex-end;
                        background: #dcf8c6;
                        color: #111827;
                    }

                    .message-bubble.lead::before {
                        content: '';
                        position: absolute;
                        left: -8px;
                        top: 0;
                        border: 8px solid transparent;
                        border-top-color: white;
                        border-right-color: white;
                    }

                    .message-bubble.clinic::before {
                        content: '';
                        position: absolute;
                        right: -8px;
                        top: 0;
                        border: 8px solid transparent;
                        border-top-color: #dcf8c6;
                        border-left-color: #dcf8c6;
                    }

                    .message-time {
                        display: block;
                        font-size: 0.625rem;
                        color: #6B7280;
                        text-align: right;
                        margin-top: 0.25rem;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        gap: 0.25rem;
                    }

                    .check {
                        font-size: 0.875rem;
                        color: #34B7F1;
                    }

                    .encryption-notice {
                        align-self: center;
                        background: #fffcce;
                        padding: 0.5rem 1rem;
                        border-radius: 0.5rem;
                        font-size: 0.75rem;
                        color: #525252;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin: 1rem 0;
                        text-align: center;
                        box-shadow: 0 1px 1px rgba(0,0,0,0.1);
                    }

                    .chat-input-area {
                        padding: 0.5rem 1rem;
                        background: #f0f0f0;
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        z-index: 10;
                    }

                    .input-wrapper {
                        flex: 1;
                        background: white;
                        border-radius: 2rem;
                        padding: 0.25rem 0.75rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: #6B7280;
                    }

                    .input-wrapper input {
                        flex: 1;
                        border: none !important;
                        padding: 0.5rem 0 !important;
                        margin: 0 !important;
                        outline: none;
                        font-size: 0.875rem;
                    }

                    .emoji-btn, .attach-btn {
                        cursor: pointer;
                        color: #6B7280;
                        transition: color 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .emoji-container {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }

                    .emoji-picker-mock {
                        position: absolute;
                        bottom: 100%;
                        left: 0;
                        background: white;
                        border: 1px solid #E5E7EB;
                        border-radius: 0.5rem;
                        padding: 0.5rem;
                        display: flex;
                        gap: 0.5rem;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        z-index: 100;
                        margin-bottom: 0.5rem;
                    }

                    .emoji-picker-mock span {
                        cursor: pointer;
                        font-size: 1.25rem;
                        transition: transform 0.1s;
                    }

                    .emoji-picker-mock span:hover {
                        transform: scale(1.2);
                    }

                    .file-msg .file-content {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: #075e54;
                        font-weight: 500;
                    }

                    .emoji-btn:hover, .attach-btn:hover {
                        color: #4B5563;
                    }

                    .send-btn {
                        background: #075e54;
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: none;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }

                    .send-btn:hover {
                        transform: scale(1.1);
                    }

                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }

                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #CBD5E1;
                        border-radius: 10px;
                    }

                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #94A3B8;
                    }
                `}</style>
            </div>
        </div >
    );
}
