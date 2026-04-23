import React, { useState, useRef, useEffect } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';
import { Patient } from '../../../types';

interface ActiveConsultationViewProps {
    patientId: string;
    onCancel: () => void;
    onComplete: (consultationId: string) => void;
}

interface TranscriptSegment {
    id: number;
    timestamp: string;
    text: string;
}

// Add SpeechRecognition types
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export const ActiveConsultationView: React.FC<ActiveConsultationViewProps> = ({ patientId, onCancel, onComplete }) => {
    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [minimized, setMinimized] = useState(false);

    // Processing State
    const [processingStep, setProcessingStep] = useState<number>(-1); // -1 = idle
    const [processingDone, setProcessingDone] = useState(false);

    const PROCESSING_STEPS = [
        { label: 'Salvando consulta...', icon: 'save' },
        { label: 'Enviando áudio...', icon: 'cloud_upload' },
        { label: 'Ativando IA Ana...', icon: 'psychology' },
        { label: 'Consulta processada com sucesso!', icon: 'check_circle' },
    ];

    // Patient State
    const [patient, setPatient] = useState<Patient | null>(null);

    // Audio Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Transcription State
    const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
    const [interimResult, setInterimResult] = useState<string>('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const durationRef = useRef(0);

    // Auto-scroll logic
    useEffect(() => {
        if (transcriptEndRef.current) {
            transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcriptSegments, interimResult]);

    // Load Patient
    useEffect(() => {
        const loadPatient = async () => {
            try {
                const data = await supabaseService.getPatient(patientId);
                setPatient(data);
            } catch (error) {
                console.error('Error loading patient:', error);
                toast.error('Erro ao carregar dados do paciente');
            }
        };
        loadPatient();
    }, [patientId]);

    // Start Recording on Mount
    useEffect(() => {
        startRecording();
        return () => {
            stopStream();
        };
    }, []);

    const stopStream = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const startRecording = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);

            const mediaRecorder = new MediaRecorder(mediaStream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    const newDuration = prev + 1;
                    durationRef.current = newDuration;
                    return newDuration;
                });
            }, 1000);

            // Initialize Speech Recognition
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'pt-BR';

                recognition.onresult = (event: any) => {
                    let interim = '';
                    let final = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }

                    if (final) {
                        const timestamp = formatTranscriptTime(durationRef.current);
                        setTranscriptSegments(prev => [...prev, {
                            id: Date.now(),
                            timestamp: timestamp,
                            text: final.trim()
                        }]);
                    }
                    setInterimResult(interim);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                };

                recognition.start();
                recognitionRef.current = recognition;
            } else {
                console.warn('Browser does not support Speech Recognition');
                toast.error('Seu navegador não suporta transcrição em tempo real.');
            }

        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Erro ao acessar o microfone. Verifique as permissões.');
            onCancel();
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (!isPaused) {
                mediaRecorderRef.current.pause();
                if (recognitionRef.current) recognitionRef.current.stop();
                setIsPaused(true);
                if (timerRef.current) clearInterval(timerRef.current);
            } else {
                mediaRecorderRef.current.resume();
                if (recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch (e) { console.error(e); }
                }
                setIsPaused(false);
                timerRef.current = setInterval(() => {
                    setDuration(prev => {
                        const newDuration = prev + 1;
                        durationRef.current = newDuration;
                        return newDuration;
                    });
                }, 1000);
            }
        }
    };

    const handleFinish = async () => {
        if (!mediaRecorderRef.current) return;

        // Stop recorder
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        // Wait for stop event ensuring we have the blob
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            stopStream(); // Clean tracks

            await saveConsultation(audioBlob);
        };
    };

    const saveConsultation = async (audioBlob: Blob) => {
        setProcessingStep(0);
        setProcessingDone(false);
        try {
            // Step 1: Create Consultation
            const consultation = await supabaseService.createConsultation({
                patientId,
                status: 'processing',
                metadata: { duration }
            });

            // Step 2: Upload Audio
            setProcessingStep(1);
            const audioPath = await supabaseService.uploadConsultationAudio(patientId, audioBlob);
            await supabaseService.updateConsultation(consultation.id, { audioPath });

            // Step 3: Trigger AI
            setProcessingStep(2);
            try {
                await supabaseService.triggerCopilotProcessing(consultation.id, audioPath);
            } catch (err) {
                console.error('N8N Trigger Error:', err);
            }

            // Step 4: Done
            setProcessingStep(3);
            setProcessingDone(true);

            // Navigate after short delay so user sees success
            setTimeout(() => {
                setProcessingStep(-1);
                onComplete(consultation.id);
            }, 1800);

        } catch (error) {
            console.error('Error saving:', error);
            setProcessingStep(-1);
            toast.error('Erro ao salvar consulta. Tente novamente.');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
    };

    const formatTranscriptTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    };

    const progressPercent = processingStep < 0 ? 0
        : Math.round(((processingStep + 1) / PROCESSING_STEPS.length) * 100);

    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col animate-in fade-in duration-300">

            {/* Processing Overlay Modal */}
            {processingStep >= 0 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-6">
                        {/* Icon */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            processingDone
                                ? 'bg-green-100 dark:bg-green-900/40'
                                : 'bg-rose-100 dark:bg-rose-900/40'
                        }`}>
                            <span className={`material-symbols-outlined text-3xl ${
                                processingDone ? 'text-green-600' : 'text-rose-500 animate-pulse'
                            }`}>
                                {PROCESSING_STEPS[processingStep]?.icon}
                            </span>
                        </div>

                        {/* Title */}
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {processingDone ? 'Tudo pronto!' : 'Finalizando Consulta'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {PROCESSING_STEPS[processingStep]?.label}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Progresso</span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                        processingDone ? 'bg-green-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="w-full space-y-2">
                            {PROCESSING_STEPS.map((step, i) => (
                                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                                    i < processingStep ? 'opacity-40'
                                    : i === processingStep ? 'bg-rose-50 dark:bg-rose-900/20'
                                    : 'opacity-25'
                                }`}>
                                    <span className={`material-symbols-outlined text-[18px] ${
                                        i < processingStep ? 'text-green-500'
                                        : i === processingStep
                                            ? processingDone && i === PROCESSING_STEPS.length - 1
                                                ? 'text-green-500'
                                                : 'text-rose-500'
                                            : 'text-gray-300'
                                    }`}>
                                        {i < processingStep ? 'check_circle'
                                            : i === processingStep && processingDone ? 'check_circle'
                                            : step.icon}
                                    </span>
                                    <span className={`text-sm ${
                                        i === processingStep
                                            ? 'text-gray-900 dark:text-white font-medium'
                                            : 'text-gray-400'
                                    }`}>{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">
                        {patient?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                            {patient?.name || 'Carregando...'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gravação Ativa: Consulta Clínica</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-500">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Main Content Split Layout */}
            <div className="flex-1 flex flex-col md:flex-row items-stretch overflow-hidden relative">

                {/* Background Decoration (Global) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-pink-100/10 to-purple-100/10 rounded-full blur-3xl opacity-30 dark:from-pink-900/5 dark:to-purple-900/5"></div>
                </div>

                {/* LEFT PANEL: Control Command (38% - compact) */}
                <div className="w-full md:w-[38%] flex flex-col items-center justify-center p-6 md:p-8 bg-gray-50/30 dark:bg-black/10 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 relative z-10">

                    {/* Microphone Pulse (Compact) */}
                    <div className="relative mb-6">
                        <div className={`absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 ${!isPaused ? 'animate-pulse' : ''}`}></div>
                        <div className="relative h-16 w-16 md:h-18 md:w-18 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                            <span className="material-symbols-outlined text-white text-2xl md:text-3xl">mic</span>
                        </div>
                    </div>

                    {/* Visualizer (Compact) */}
                    <div className="h-12 w-full max-w-xs mb-6 flex items-center justify-center">
                        {isRecording && !isPaused && (
                            <AudioVisualizer
                                stream={stream}
                                isRecording={isRecording}
                                barColor="#f43f5e"
                                gap={3}
                            />
                        )}
                        {isPaused && <span className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Pausado</span>}
                    </div>

                    {/* Timer (Scaled Down) */}
                    <div className="flex flex-col items-center mb-8">
                        <span className="text-[9px] font-black text-gray-400 tracking-[0.3em] mb-2 uppercase">Tempo de Consulta</span>
                        <div className="text-4xl md:text-5xl font-mono font-bold text-gray-800 dark:text-white tracking-tighter">
                            {formatTime(duration)}
                        </div>
                    </div>

                    {/* Compact Controls Cluster */}
                    <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={pauseRecording}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700/50 font-bold text-gray-600 dark:text-gray-300 transition-all text-xs"
                            >
                                <span className="material-symbols-outlined text-base">{isPaused ? 'play_arrow' : 'pause'}</span>
                                {isPaused ? 'Retomar' : 'Pausar'}
                            </button>
                            <button
                                onClick={() => toast.success('Marcador em ' + formatTime(duration))}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700/50 font-bold text-gray-600 dark:text-gray-300 transition-all text-xs"
                            >
                                <span className="material-symbols-outlined text-base">bookmark</span>
                                Marcar
                            </button>
                        </div>

                        <button
                            onClick={handleFinish}
                            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-black shadow-lg shadow-red-500/20 transition-all active:scale-[0.97] uppercase tracking-wider text-xs"
                        >
                            <span className="material-symbols-outlined text-base">stop_circle</span>
                            Finalizar Consulta
                        </button>

                        <button
                            onClick={() => {
                                if (confirm('Tem certeza que deseja cancelar? A gravação será descartada.')) {
                                    stopStream();
                                    onCancel();
                                }
                            }}
                            className="text-[9px] font-black text-gray-400 hover:text-red-500 transition-colors py-2 mt-1 uppercase tracking-widest text-center"
                        >
                            Cancelar e Descartar
                        </button>
                    </div>
                </div>

                {/* RIGHT PANEL: Injective Transcription Stream (62%) */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 md:pl-12 bg-white dark:bg-gray-900 relative z-10 custom-scrollbar scroll-smooth">
                    <div className="max-w-3xl">

                        {/* Live Status Indicator */}
                        <div className="flex items-center justify-between mb-8 border-b border-gray-50 dark:border-gray-800 pb-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="size-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                Transcrição ao vivo
                            </h3>
                            {interimResult && (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider animate-in fade-in">
                                    Processando áudio
                                </span>
                            )}
                        </div>

                        {transcriptSegments.length > 0 || interimResult ? (
                            <div className="space-y-6">
                                {transcriptSegments.map((segment) => (
                                    <div key={segment.id} className="group animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="flex items-start gap-4">
                                            <span className="text-[9px] font-bold font-mono text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded mt-1 min-w-[45px] text-center">
                                                {segment.timestamp}
                                            </span>
                                            <p className="flex-1 text-gray-700 dark:text-gray-200 text-sm md:text-base leading-relaxed font-medium">
                                                {segment.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {interimResult && (
                                    <div className="flex items-start gap-4 animate-pulse">
                                        <span className="text-[9px] font-bold font-mono text-blue-300 dark:text-blue-900 bg-blue-50/50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded mt-1 min-w-[45px] text-center">
                                            {formatTranscriptTime(duration)}
                                        </span>
                                        <p className="flex-1 text-gray-400 dark:text-gray-500 text-sm md:text-base leading-relaxed italic font-medium">
                                            {interimResult}
                                        </p>
                                    </div>
                                )}
                                <div ref={transcriptEndRef} className="h-24" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-300 dark:text-gray-700 gap-3">
                                <div className="size-12 rounded-full border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                                    <span className="material-symbols-outlined text-2xl opacity-30">graphic_eq</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Capturando áudio...</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Footer Status Bar */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        Processamento em tempo real ativo
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">wifi</span>
                        Conexão estável
                    </span>
                </div>
                <div>
                    Ana v2.4.0 • HIPAA Compliant
                </div>
            </div>
        </div>
    );
};
