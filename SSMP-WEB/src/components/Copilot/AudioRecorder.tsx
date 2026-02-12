import React, { useState, useRef, useEffect } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';

interface CopilotRecorderProps {
    patientId: string;
    onRecordingComplete?: (consultationId: string) => void;
}

export const CopilotRecorder: React.FC<CopilotRecorderProps> = ({ patientId, onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

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

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                setStream(null);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Erro ao acessar o microfone. Verifique as permissões.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording && !isPaused) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerRef.current) clearInterval(timerRef.current);
        } else if (mediaRecorderRef.current && isRecording && isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setDuration(0);
        setIsRecording(false);
        setIsPaused(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleSave = async () => {
        if (!audioBlob) return;

        setIsUploading(true);
        try {
            // 1. Create Consultation Draft
            const consultation = await supabaseService.createConsultation({
                patientId,
                status: 'processing',
                metadata: { duration }
            });

            // 2. Upload Audio
            const audioPath = await supabaseService.uploadConsultationAudio(patientId, audioBlob);

            // 3. Update Consultation with Audio Path
            await supabaseService.updateConsultation(consultation.id, {
                audioPath
            });

            // 4. Trigger AI Processing (Non-blocking attempt)
            try {
                await supabaseService.triggerCopilotProcessing(consultation.id, audioPath);
                toast.success('Consulta gravada e enviada para processamento!');
            } catch (n8nError) {
                console.error('N8N Trigger Failed:', n8nError);
                toast.success('Consulta gravada!', { icon: '💾' });
                toast.error('Erro ao conectar com n8n. Verifique o console.', { duration: 5000 });
            }

            if (onRecordingComplete) {
                onRecordingComplete(consultation.id);
            }

            resetRecording();

        } catch (error) {
            console.error('Error saving consultation:', error);
            toast.error('Erro ao salvar a consulta. Tente novamente.');
        } finally {
            setIsUploading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full max-w-md mx-auto">
            <div className="flex flex-col gap-4">

                {/* Visualizer Area */}
                <div className="relative bg-gray-50 rounded-lg h-24 flex items-center justify-center overflow-hidden border border-gray-200">
                    {isRecording && !isPaused ? (
                        <AudioVisualizer
                            stream={stream}
                            isRecording={isRecording}
                            barColor="#10b981" // emerald-500
                            gap={3}
                        />
                    ) : audioBlob ? (
                        <div className="text-gray-500 font-medium">Gravação Finalizada</div>
                    ) : (
                        <div className="text-gray-400 text-sm">Pronto para gravar</div>
                    )}

                    {/* Timer Overlay */}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full font-mono">
                        {formatTime(duration)}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    {!isRecording && !audioBlob && (
                        <button
                            onClick={startRecording}
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]">mic</span>
                            Iniciar Gravação
                        </button>
                    )}

                    {isRecording && (
                        <>
                            <button
                                onClick={pauseRecording}
                                className={`p-3 rounded-full transition-colors ${isPaused ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                title={isPaused ? "Retomar" : "Pausar"}
                            >
                                {isPaused ? <span className="material-symbols-outlined text-[20px]">play_arrow</span> : <span className="material-symbols-outlined text-[20px]">pause</span>}
                            </button>

                            <button
                                onClick={stopRecording}
                                className="bg-red-100 text-red-600 hover:bg-red-200 p-3 rounded-full transition-colors"
                                title="Parar"
                            >
                                <span className="material-symbols-outlined text-[20px]">stop</span>
                            </button>
                        </>
                    )}

                    {audioBlob && !isUploading && (
                        <>
                            <button
                                onClick={resetRecording}
                                className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                title="Descartar e Gravar Novo"
                            >
                                <span className="material-symbols-outlined text-[20px]">refresh</span>
                            </button>

                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">save</span>
                                Salvar e Processar
                            </button>
                        </>
                    )}

                    {isUploading && (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                            <span className="text-sm font-medium">Enviando...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
