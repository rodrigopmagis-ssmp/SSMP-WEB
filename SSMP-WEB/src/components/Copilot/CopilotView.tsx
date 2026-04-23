import React, { useState, useEffect } from 'react';
import { ActiveConsultationView } from './ActiveConsultationView';
import { CopilotTimeline } from './CopilotTimeline';
import { CopilotHistorySidebar } from './CopilotHistorySidebar';
import { CopilotNewConsultation } from './CopilotNewConsultation';
import { supabaseService } from '../../services/supabaseService';
import { Consultation, Patient } from '../../../types';

interface CopilotViewProps {
    patientId: string;
    onBack: () => void;
}

export const CopilotView: React.FC<CopilotViewProps> = ({ patientId, onBack }) => {
    // State
    const [viewMode, setViewMode] = useState<'new' | 'recording' | 'details'>('new');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<Patient | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, [patientId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [consultationsData, patientData] = await Promise.all([
                supabaseService.getPatientConsultations(patientId),
                supabaseService.getPatient(patientId)
            ]);
            setConsultations(consultationsData as Consultation[]);
            setPatient(patientData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Navigation Handlers
    const handleSelectConsultation = (id: string) => {
        setSelectedId(id);
        setViewMode('details');
    };

    const handleNewConsultation = () => {
        setSelectedId(null);
        setViewMode('new');
    };

    const handleStartRecording = () => {
        // console.log('Starting recording...');
        setViewMode('recording');
    };

    const handleRecordingComplete = (id: string) => {
        loadData(); // Refresh list
        setSelectedId(id);
        setViewMode('details');
    };

    const handleCancelRecording = () => {
        setViewMode('new');
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0a0a0a] flex animate-in fade-in duration-300 selection:bg-rose-500/30">

            {/* Main Layout: Boundless Experience */}
            <div className="flex w-full h-full items-stretch overflow-hidden relative">

                {/* Left Action Strip (Technical/Minimal) */}
                <div className="flex flex-col items-center pt-4 px-1 bg-gray-50/50 dark:bg-black/20 border-r border-gray-100 dark:border-white/5 shrink-0 z-30">
                    <button
                        onClick={onBack}
                        className="group flex flex-col items-center gap-1.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/5 transition-all text-gray-400 hover:text-rose-500"
                        title="Sair da Ana"
                    >
                        <div className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent group-hover:border-rose-500/10 transition-all">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </div>
                        <span className="text-[7.5px] font-black uppercase tracking-tighter">Sair</span>
                    </button>

                    <div className="mt-auto mb-6 flex flex-col gap-4">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                </div>

                {/* Sidebar Component */}
                <CopilotHistorySidebar
                    consultations={consultations}
                    selectedId={selectedId}
                    loading={loading}
                    onSelect={handleSelectConsultation}
                    onNewConsultation={handleNewConsultation}
                />

                {/* Main Dynamic Surface */}
                <div className="flex-1 overflow-hidden relative z-10">

                    {/* View Transitions */}
                    <div className="h-full relative overflow-hidden">
                        {viewMode === 'new' && (
                            <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <CopilotNewConsultation
                                    patientName={patient?.name || ''}
                                    onStartRecording={handleStartRecording}
                                />
                            </div>
                        )}

                        {viewMode === 'recording' && (
                            <div className="h-full animate-in fade-in zoom-in-95 duration-500">
                                <ActiveConsultationView
                                    patientId={patientId}
                                    onCancel={handleCancelRecording}
                                    onComplete={handleRecordingComplete}
                                />
                            </div>
                        )}

                        {viewMode === 'details' && selectedId && (
                            <div className="h-full bg-white dark:bg-[#0d0d0d] overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-500 relative">
                                <CopilotTimeline consultationId={selectedId} />
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
};
