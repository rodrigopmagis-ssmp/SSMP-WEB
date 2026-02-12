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
        <div className="fixed inset-0 z-[9999] bg-gray-100 dark:bg-gray-900 flex animate-in fade-in duration-200">

            {/* Layout Container */}
            <div className="flex w-full h-full bg-white dark:bg-gray-900 rounded-none shadow-none items-stretch overflow-hidden">

                {/* 0. Back Button Column */}
                <div className="flex flex-col items-center pt-4 px-2 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                        title="Voltar para o sistema"
                    >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">arrow_back</span>
                    </button>
                </div>

                {/* 1. Sidebar (Fixed Width) */}
                <CopilotHistorySidebar
                    consultations={consultations}
                    selectedId={selectedId}
                    loading={loading}
                    onSelect={handleSelectConsultation}
                    onNewConsultation={handleNewConsultation}
                />

                {/* 2. Main Content Area (Flexible) */}
                <div className="flex-1 bg-gray-50 dark:bg-black/20 overflow-hidden relative">

                    {viewMode === 'new' && (
                        <CopilotNewConsultation
                            patientName={patient?.name || ''}
                            onStartRecording={handleStartRecording}
                        />
                    )}

                    {viewMode === 'recording' && (
                        <ActiveConsultationView
                            patientId={patientId}
                            onCancel={handleCancelRecording}
                            onComplete={handleRecordingComplete}
                        />
                    )}

                    {viewMode === 'details' && selectedId && (
                        <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
                            {/* Wrapper for Timeline to handle internal scroll */}
                            <CopilotTimeline consultationId={selectedId} />
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
};
