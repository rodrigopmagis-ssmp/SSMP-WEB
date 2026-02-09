import React, { useState, useEffect } from 'react';
import { OmbudsmanContact, ResponseStatus } from '../../types';
import { supabaseService } from '../../src/services/supabaseService';
import ContactCard from './ContactCard';
import toast from 'react-hot-toast';

interface ContactTimelineProps {
    complaintId: string;
    onAddContact: () => void;
}

const ContactTimeline: React.FC<ContactTimelineProps> = ({ complaintId, onAddContact }) => {
    const [contacts, setContacts] = useState<OmbudsmanContact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContacts();
    }, [complaintId]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const data = await supabaseService.getComplaintContacts(complaintId);
            setContacts(data);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            toast.error('Erro ao carregar contatos');
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (contactId: string, response: string, status: ResponseStatus) => {
        try {
            await supabaseService.updateContactResponse(contactId, response, status);
            toast.success('Resposta registrada com sucesso!');
            await fetchContacts();
        } catch (error) {
            console.error('Error updating contact response:', error);
            toast.error('Erro ao registrar resposta');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Histórico de Contatos
                </h3>
                <button
                    onClick={onAddContact}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Novo Contato
                </button>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-primary/10">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">contact_phone</span>
                    <p className="text-gray-500 dark:text-gray-400">Nenhum contato registrado ainda</p>
                    <button
                        onClick={onAddContact}
                        className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Registrar Primeiro Contato
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {contacts.map((contact) => (
                        <ContactCard
                            key={contact.id}
                            contact={contact}
                            onRespond={handleRespond}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactTimeline;
