import React, { useState, useEffect } from 'react';
import { Lead, Estagio, Clinic } from '../types';
import { negociosService } from '../src/services/negociosService';
import { supabaseService } from '../src/services/supabaseService';
import { supabase } from '../lib/supabase';

interface NovoNegocioModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function NovoNegocioModal({ onClose, onSuccess }: NovoNegocioModalProps) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Clinic state
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [userClinicId, setUserClinicId] = useState<string | null>(null);
    const [selectedClinicId, setSelectedClinicId] = useState<string>('');
    const [loadingClinics, setLoadingClinics] = useState(true);

    // Form state
    const [mode, setMode] = useState<'select' | 'create'>('select');
    const [selectedLeadId, setSelectedLeadId] = useState('');

    // New lead fields
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [initialStage, setInitialStage] = useState<Estagio>('lead_quiz');

    useEffect(() => {
        loadLeads();
        loadClinicContext();
    }, []);

    const loadClinicContext = async () => {
        try {
            setLoadingClinics(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's profile to check if they have a clinic_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id, role')
                .eq('id', user.id)
                .single();

            if (profile?.clinic_id) {
                setUserClinicId(profile.clinic_id);
                setSelectedClinicId(profile.clinic_id);
            } else {
                // User has no default clinic - load all clinics for selection
                const { data: clinicsData } = await supabase
                    .from('clinics')
                    .select('id, fantasy_name, slug')
                    .order('fantasy_name');

                if (clinicsData && clinicsData.length > 0) {
                    setClinics(clinicsData as Clinic[]);
                    setSelectedClinicId(clinicsData[0].id); // Pre-select first
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contexto de clínica:', error);
        } finally {
            setLoadingClinics(false);
        }
    };

    const loadLeads = async () => {
        try {
            setLoading(true);
            const data = await supabaseService.getLeads();
            // Filter leads que ainda não têm Deal
            const leadsWithoutDeals = data.filter(lead => !lead.protocol_data?.has_deal);
            setLeads(leadsWithoutDeals);
        } catch (error) {
            console.error('Erro ao carregar leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'select' && !selectedLeadId) {
            alert('Selecione um lead');
            return;
        }

        if (mode === 'create' && (!name || !whatsapp)) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        // Validate clinic selection for users without default clinic
        if (!userClinicId && !selectedClinicId) {
            alert('Selecione uma clínica');
            return;
        }

        const clinicIdToUse = userClinicId || selectedClinicId;

        setCreating(true);
        try {
            if (mode === 'select') {
                // Create deal from existing lead
                await negociosService.criarNegocioDeLead(
                    selectedLeadId,
                    initialStage,
                    undefined, // idVendedor
                    clinicIdToUse
                );
            } else {
                // Create lead first, then deal
                const leadData = {
                    name,
                    whatsapp,
                    concerns: [],
                    procedure_awareness: '',
                    previous_experience: '',
                    budget_range: '',
                    timeline: '',
                    availability: [],
                    commitment_level: '',
                    kanban_status: 'Frio' as const,
                    clinic_id: clinicIdToUse // Pass clinic_id to lead creation
                };

                const newLead = await supabaseService.createLead(leadData);
                await negociosService.criarNegocioDeLead(
                    newLead.id,
                    initialStage,
                    undefined, // idVendedor
                    clinicIdToUse
                );
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao criar negócio:', error);
            alert(`Erro ao criar negócio: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>➕ Novo Negócio</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* Mode Toggle */}
                    <div className="mode-toggle">
                        <button
                            className={`toggle-btn ${mode === 'select' ? 'active' : ''}`}
                            onClick={() => setMode('select')}
                        >
                            Importar Lead
                        </button>
                        <button
                            className={`toggle-btn ${mode === 'create' ? 'active' : ''}`}
                            onClick={() => setMode('create')}
                        >
                            Criar Direto
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {mode === 'select' ? (
                            <>
                                <div className="form-group">
                                    <label>Selecione o Lead *</label>
                                    {loading ? (
                                        <p className="loading-text">Carregando leads...</p>
                                    ) : leads.length === 0 ? (
                                        <p className="empty-text">Nenhum lead disponível sem negócio</p>
                                    ) : (
                                        <select
                                            value={selectedLeadId}
                                            onChange={(e) => setSelectedLeadId(e.target.value)}
                                            required
                                            aria-label="Selecionar lead"
                                        >
                                            <option value="">Escolha um lead...</option>
                                            {leads.map(lead => (
                                                <option key={lead.id} value={lead.id}>
                                                    {lead.name} - {lead.whatsapp}
                                                    {lead.ai_score && ` (Score: ${lead.ai_score})`}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Nome *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nome do lead"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>WhatsApp *</label>
                                    <input
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Clinic Selector - only shown when user has no default clinic */}
                        {!userClinicId && clinics.length > 0 && (
                            <div className="form-group">
                                <label>Clínica *</label>
                                {loadingClinics ? (
                                    <p className="loading-text">Carregando clínicas...</p>
                                ) : (
                                    <select
                                        value={selectedClinicId}
                                        onChange={(e) => setSelectedClinicId(e.target.value)}
                                        required
                                        aria-label="Selecionar clínica"
                                    >
                                        {clinics.map(clinic => (
                                            <option key={clinic.id} value={clinic.id}>
                                                {clinic.fantasy_name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Estágio Inicial</label>
                            <select
                                value={initialStage}
                                onChange={(e) => setInitialStage(e.target.value as Estagio)}
                                aria-label="Estágio inicial"
                            >
                                <option value="lead_quiz">Lead Quiz</option>
                                <option value="em_atendimento">Em Atendimento</option>
                                <option value="qualific ado">Qualificado</option>
                                <option value="oferta_consulta">Oferta de Consulta</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                disabled={creating}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={creating}
                            >
                                {creating ? 'Criando...' : 'Criar Negócio'}
                            </button>
                        </div>
                    </form>
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
                        max-width: 500px;
                        width: 100%;
                        max-height: 90vh;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.5rem;
                        border-bottom: 1px solid #E5E7EB;
                    }

                    .modal-header h2 {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #111827;
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

                    .modal-body {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1.5rem;
                    }

                    .mode-toggle {
                        display: flex;
                        gap: 0.5rem;
                        margin-bottom: 1.5rem;
                        background: #F3F4F6;
                        padding: 0.25rem;
                        border-radius: 0.5rem;
                    }

                    .toggle-btn {
                        flex: 1;
                        padding: 0.625rem;
                        background: transparent;
                        border: none;
                        border-radius: 0.375rem;
                        font-weight: 500;
                        font-size: 0.875rem;
                        color: #6B7280;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .toggle-btn.active {
                        background: white;
                        color: #111827;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    }

                    .form-group {
                        margin-bottom: 1.25rem;
                    }

                    .form-group label {
                        display: block;
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 0.5rem;
                    }

                    .form-group input,
                    .form-group select {
                        width: 100%;
                        padding: 0.625rem;
                        border: 1px solid #D1D5DB;
                        border-radius: 0.5rem;
                        font-size: 0.875rem;
                        font-family: inherit;
                        transition: all 0.2s;
                    }

                    .form-group input:focus,
                    .form-group select:focus {
                        outline: none;
                        border-color: #3B82F6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }

                    .loading-text,
                    .empty-text {
                        font-size: 0.875rem;
                        color: #9CA3AF;
                        text-align: center;
                        padding: 1rem;
                        background: #F9FAFB;
                        border-radius: 0.5rem;
                    }

                    .form-actions {
                        display: flex;
                        gap: 0.75rem;
                        margin-top: 1.5rem;
                    }

                    .btn-primary,
                    .btn-secondary {
                        flex: 1;
                        padding: 0.75rem 1.5rem;
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

                    .btn-primary:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(154, 76, 95, 0.3);
                    }

                    .btn-primary:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .btn-secondary {
                        background: white;
                        border: 1px solid #D1D5DB;
                        color: #374151;
                    }

                    .btn-secondary:hover:not(:disabled) {
                        background: #F9FAFB;
                        border-color: #9CA3AF;
                    }

                    .btn-secondary:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                `}</style>
            </div>
        </div>
    );
}
