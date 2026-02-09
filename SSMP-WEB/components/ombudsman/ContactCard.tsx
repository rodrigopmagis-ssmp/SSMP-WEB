import React from 'react';
import { OmbudsmanContact } from '../../types';

interface ContactCardProps {
    contact: OmbudsmanContact;
    onRespond: (contactId: string, response: string, status: 'responded' | 'no_response') => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onRespond }) => {
    const [showResponseForm, setShowResponseForm] = React.useState(false);
    const [responseText, setResponseText] = React.useState('');

    const getMethodIcon = (method: string) => {
        const icons: Record<string, string> = {
            phone: 'call',
            whatsapp: 'chat',
            email: 'email',
            in_person: 'person'
        };
        return icons[method] || 'contact_mail';
    };

    const getMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            phone: 'Telefone',
            whatsapp: 'WhatsApp',
            email: 'E-mail',
            in_person: 'Presencial'
        };
        return labels[method] || method;
    };

    const handleSubmitResponse = (status: 'responded' | 'no_response') => {
        onRespond(contact.id, responseText, status);
        setShowResponseForm(false);
        setResponseText('');
    };

    return (
        <div className="bg-white dark:bg-[#2d181e] border border-gray-200 dark:border-primary/10 rounded-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">
                        {getMethodIcon(contact.contact_method)}
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {getMethodLabel(contact.contact_method)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(contact.contacted_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                {contact.response_status === 'pending' && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Aguardando
                    </span>
                )}
                {contact.response_status === 'responded' && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                        Respondeu
                    </span>
                )}
                {contact.response_status === 'no_response' && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                        Não Respondeu
                    </span>
                )}
            </div>

            {/* Message */}
            <div className="bg-gray-50 dark:bg-black/20 rounded p-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Mensagem Enviada</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{contact.message}</p>
            </div>

            {/* Response Section */}
            {contact.response && (
                <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 border border-green-200 dark:border-green-800/30">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Resposta do Paciente</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{contact.response}</p>
                    {contact.responded_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(contact.responded_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>
            )}

            {/* Response Form */}
            {contact.response_status === 'pending' && !showResponseForm && (
                <div className="pt-2 border-t border-gray-200 dark:border-primary/10">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">O paciente respondeu?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowResponseForm(true)}
                            className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800/30 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">thumb_up</span>
                            Sim, respondeu
                        </button>
                        <button
                            onClick={() => handleSubmitResponse('no_response')}
                            className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/30 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">thumb_down</span>
                            Não respondeu
                        </button>
                    </div>
                </div>
            )}

            {showResponseForm && (
                <div className="pt-2 border-t border-gray-200 dark:border-primary/10 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Resposta do paciente:
                    </label>
                    <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                        rows={3}
                        placeholder="Digite a resposta do paciente..."
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSubmitResponse('responded')}
                            disabled={!responseText.trim()}
                            className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Salvar Resposta
                        </button>
                        <button
                            onClick={() => {
                                setShowResponseForm(false);
                                setResponseText('');
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactCard;
