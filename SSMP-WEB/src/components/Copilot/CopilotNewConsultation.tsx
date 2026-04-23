import React from 'react';

interface CopilotNewConsultationProps {
    patientName: string;
    onStartRecording: () => void;
}

export const CopilotNewConsultation: React.FC<CopilotNewConsultationProps> = ({ patientName, onStartRecording }) => {
    return (
        <div className="flex-1 h-full bg-white dark:bg-[#0a0a0a] overflow-y-auto relative selection:bg-rose-500/30">

            {/* Grain Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-[1]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Asymmetric Background Narrative Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-rose-500/[0.03] dark:bg-rose-500/[0.02] rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] bg-blue-500/[0.03] dark:bg-blue-500/[0.01] rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-4xl mx-auto h-full min-h-[500px] flex flex-col md:flex-row items-center justify-center p-6 md:p-8 gap-8 md:gap-16 relative z-10">

                {/* VISUAL HERO: Compact Typographic */}
                <div className="w-full md:w-[50%] flex flex-col items-center md:items-start text-center md:text-left relative">

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-[1] mb-6 tracking-tighter">
                        Bem-vindo à <br />
                        <span className="relative">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">Ana</span>
                            <span className="absolute -right-3 top-0 text-rose-500 text-lg">✦</span>
                        </span>
                    </h1>

                    <div className="relative pl-4 md:pl-6 border-l-2 border-rose-500/20 max-w-sm">
                        <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium leading-normal">
                            Sua assistente inteligente para consultas médicas. Grave sua consulta com segurança e deixe que a <strong className="text-gray-900 dark:text-white font-black underline decoration-rose-500/50 decoration-2">Ana</strong> transforme a conversa em um prontuário personalizado.
                        </p>
                    </div>
                </div>

                {/* CONTROLS CLUSTER: Compact & Technical */}
                <div className="w-full md:w-[320px] relative">

                    {/* Config Card */}
                    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/5 shadow-xl p-6 rounded-[24px] relative z-20 overflow-hidden group">

                        {/* Status Bar */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Medical Config</h3>
                            <div className="flex gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800"></span>
                            </div>
                        </div>

                        {/* Mic Selection */}
                        <div className="p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between mb-6 group-hover:border-rose-500/20 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center border border-gray-50 dark:border-white/5">
                                    <span className="material-symbols-outlined text-rose-500 text-lg">mic_external_on</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-800 dark:text-white">Studio Mic</p>
                                    <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Active</p>
                                </div>
                            </div>
                        </div>

                        {/* START ACTION */}
                        <button
                            onClick={onStartRecording}
                            className="group/btn relative w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-rose-500/10 overflow-hidden"
                        >
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-white text-lg">radio_button_checked</span>
                                    <span className="uppercase tracking-[0.15em] text-[11px]">Iniciar Sessão</span>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                        </button>

                        <p className="text-[8px] text-center text-gray-400 mt-4 font-medium opacity-60">
                            Foco total no paciente. <br /> A Ana cuida do prontuário.
                        </p>
                    </div>

                    <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-rose-500/10 rounded-full blur-xl z-10"></div>
                </div>

            </div>
        </div>
    );
};
