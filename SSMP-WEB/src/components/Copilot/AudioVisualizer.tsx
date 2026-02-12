import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    stream: MediaStream | null;
    isRecording: boolean;
    barColor?: string;
    gap?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    stream,
    isRecording,
    barColor = 'rgb(59, 130, 246)', // blue-500
    gap = 2
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode>();
    const audioContextRef = useRef<AudioContext>();
    const sourceRef = useRef<MediaStreamAudioSourceNode>();

    useEffect(() => {
        if (!stream || !isRecording || !canvasRef.current) return;

        // Initialize Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audioCtx = audioContextRef.current;

        // Ensure context is running (it might be suspended by browser policy)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyserRef.current = analyser;
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;

            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height; // Normalize to canvas height

                // Draw rounded bars or simple rects
                ctx.fillStyle = barColor;

                // Rounded top effect
                if (barHeight > 0) {
                    ctx.fillRect(x, height - barHeight, barWidth - gap, barHeight);
                }

                x += barWidth;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }
            // Note: We don't close the AudioContext here to reuse it, 
            // or we could close it if we want to clean up completely.
            // For a long-lived component, keeping it might be better, 
            // but usually strictly scoping to the stream lifecycle is safer.
        };
    }, [stream, isRecording, barColor, gap]);

    // Handle idle state drawing (flat line)
    useEffect(() => {
        if ((!isRecording || !stream) && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Optional: Draw a center line
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.strokeStyle = '#e5e7eb'; // gray-200
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }, [isRecording, stream]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={60}
            className="w-full h-16 rounded-lg bg-gray-50"
        />
    );
};
