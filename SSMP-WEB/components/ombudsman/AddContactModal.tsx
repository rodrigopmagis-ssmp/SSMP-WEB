import React, { useState } from 'react';
import { ContactType, ContactMethod, OmbudsmanContact } from '../../types';
import { supabaseService } from '../../src/services/supabaseService';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    complaintId: string;
    onSuccess: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, complaintId, onSuccess }) => {
    const [contactType, setContactType] = useState<ContactType>('outgoing');
    const [contactMethod, setContactMethod] = useState<ContactMethod>('whatsapp');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Por favor, preencha a mensagem');
            return;
        }

        try {
            setLoading(true);
            await supabaseService.addContact({
                complaint_id: complaintId,
                contact_type: contactType,
                contact_method: contactMethod,
                message: message.trim(),
                response_status: 'pending'
            });

            toast.success('Contato registrado com sucesso!');
            onSuccess();
            handleClose();
        } catch (error) {
            console.error('Error adding contact:', error);
            toast.error('Erro ao registrar contato');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setContactType('outgoing');
        setContactMethod('whatsapp');
        setMessage('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#2d181e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-[#2d181e] border-b border-gray-200 dark:border-primary/10 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">contact_phone</span>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar Contato</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Contato *
                            </label>
                            <select
                                value={contactType}
                                onChange={(e) => setContactType(e.target.value as ContactType)}
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                required
                            >
                                <option value="outgoing">Saída (Nós contatamos)</option>
                                <option value="incoming">Entrada (Paciente contatou)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Método de Contato *
                            </label>
                            <select
                                value={contactMethod}
                                onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                required
                            >
                                <option value="whatsapp">WhatsApp</option>
                                <option value="phone">Telefone</option>
                                <option value="email">E-mail</option>
                                <option value="in_person">Presencial</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensagem / Descrição do Contato *
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                            rows={5}
                            placeholder="Descreva o contato realizado ou a mensagem enviada..."
                            required
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                <p className="font-semibold mb-1">Controle de Resposta</p>
                                <p>Após registrar o contato, você poderá marcar se o paciente respondeu ou não, similar ao sistema de acompanhamento.</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Registrando...' : 'Registrar Contato'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddContactModal;
