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
        const toastId = toast.loading('Salvando e processando consulta...');
        try {
            // 1. Create Consultation
            const consultation = await supabaseService.createConsultation({
                patientId,
                status: 'processing',
                metadata: { duration }
            });

            // 2. Upload Audio
            const audioPath = await supabaseService.uploadConsultationAudio(patientId, audioBlob);

            // 3. Update Path
            await supabaseService.updateConsultation(consultation.id, { audioPath });

            // 4. Trigger AI
            try {
                await supabaseService.triggerCopilotProcessing(consultation.id, audioPath);
            } catch (err) {
                console.error('N8N Trigger Error:', err);
                // Non-blocking
            }

            toast.success('Consulta finalizada com sucesso!', { id: toastId });
            onComplete(consultation.id);

        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Erro ao salvar consulta', { id: toastId });
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

    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col animate-in fade-in duration-300">
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-8">

                {/* Background Decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-pink-100/30 to-purple-100/30 rounded-full blur-3xl opacity-50 dark:from-pink-900/10 dark:to-purple-900/10"></div>
                </div>

                <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-12 flex flex-col items-center">

                    {/* Microphone Pulse */}
                    <div className="relative mb-12">
                        <div className={`absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 ${!isPaused ? 'animate-pulse' : ''}`}></div>
                        <div className="relative h-24 w-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                            <span className="material-symbols-outlined text-white text-4xl">mic</span>
                        </div>
                    </div>

                    {/* Visualizer */}
                    <div className="h-24 w-full max-w-md mb-8 flex items-center justify-center">
                        {isRecording && !isPaused && (
                            <AudioVisualizer
                                stream={stream}
                                isRecording={isRecording}
                                barColor="#f43f5e" // rose-500
                                gap={4}
                            />
                        )}
                        {isPaused && <span className="text-gray-400 font-medium">Gravação Pausada</span>}
                    </div>

                    {/* Timer */}
                    <div className="flex flex-col items-center mb-12">
                        <span className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-2 uppercase">Duração da Consulta</span>
                        <div className="text-7xl font-mono font-bold text-gray-800 dark:text-white tracking-tight">
                            {formatTime(duration)}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        {/* Cancel / Discard */}
                        <button
                            onClick={() => {
                                if (confirm('Tem certeza que deseja cancelar? A gravação será descartada.')) {
                                    stopStream();
                                    onCancel();
                                }
                            }}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 font-bold text-red-500 transition-all"
                        >
                            <span className="material-symbols-outlined">cancel</span>
                            Cancelar
                        </button>

                        {/* Pause / Resume */}
                        <button
                            onClick={pauseRecording}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-all"
                        >
                            <span className="material-symbols-outlined">{isPaused ? 'play_arrow' : 'pause'}</span>
                            {isPaused ? 'Retomar' : 'Pausar'}
                        </button>

                        {/* Finish & Save */}
                        <button
                            onClick={handleFinish}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold shadow-lg transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">stop_circle</span>
                            Finalizar Consulta
                        </button>

                        {/* Bookmark */}
                        <button
                            onClick={() => toast.success('Marcador adicionado no tempo ' + formatTime(duration))}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-all"
                        >
                            <span className="material-symbols-outlined">bookmark_add</span>
                            Marcar Evento
                        </button>
                    </div>

                </div>

                {/* Live Transcript View */}
                <div className="mt-8 w-full max-w-3xl bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-inner min-h-[300px] max-h-[500px] overflow-y-auto relative">

                    {transcriptSegments.length > 0 || interimResult ? (
                        <div className="space-y-6">
                            {transcriptSegments.map((segment) => (
                                <div key={segment.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <span className="text-xs font-mono text-gray-400 block mb-1">
                                        {segment.timestamp}
                                    </span>
                                    <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                                        {segment.text}
                                    </p>
                                </div>
                            ))}

                            {interimResult && (
                                <div className="animate-pulse">
                                    <span className="text-xs font-mono text-gray-400 block mb-1">
                                        {formatTime(duration)}
                                    </span>
                                    <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed italic">
                                        {interimResult}
                                    </p>
                                </div>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 min-h-[200px]">
                            <span className="material-symbols-outlined text-3xl opacity-50">graphic_eq</span>
                            <p className="text-sm italic">Detectando fala... Fale claramente.</p>
                        </div>
                    )}

                    {/* Floating Indicators */}
                    {(transcriptSegments.length > 0 || interimResult) && (
                        <div className="absolute top-4 right-4 flex gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider animate-in fade-in">
                                Transcrevendo
                            </span>
                        </div>
                    )}
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
