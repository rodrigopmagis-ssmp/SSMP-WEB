import React from 'react';

interface CopilotNewConsultationProps {
    patientName: string;
    onStartRecording: () => void;
}

export const CopilotNewConsultation: React.FC<CopilotNewConsultationProps> = ({ patientName, onStartRecording }) => {
    return (
        <div className="flex-1 h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-12">
                <div className="flex items-center gap-2 mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Nova Consulta</h1>
                    <span className="material-symbols-outlined" style={{ color: '#833AB4' }}>edit_note</span>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md p-8">

                    {/* Intro Text */}
                    <div className="mb-8 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-base">Clique abaixo para iniciar a gravação da consulta para <strong className="text-gray-800 dark:text-white">{patientName}</strong>.</p>
                        <p className="text-sm mt-2">A IA irá transcrever e analisar o áudio automaticamente.</p>
                    </div>

                    {/* Mic Selection */}
                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-emerald-500">mic</span>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">Padrão - Microfone (System Default)</p>
                                <p className="text-xs text-emerald-600 font-medium">Captando áudio</p>
                            </div>
                        </div>
                        <button className="text-sm font-bold hover:underline" style={{ color: '#833AB4' }}>Alterar</button>
                    </div>

                    {/* Start Recording Button */}
                    <button
                        onClick={onStartRecording}
                        className="w-full text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                        style={{ backgroundColor: '#833AB4' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6e2f99')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#833AB4')}
                    >
                        <span className="material-symbols-outlined">mic</span>
                        Gravar consulta
                    </button>

                </div>
            </div>
        </div>
    );
};
