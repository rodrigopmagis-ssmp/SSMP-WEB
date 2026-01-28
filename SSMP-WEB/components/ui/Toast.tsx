import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };

    return (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white transform animate-in slide-in-from-right-full duration-300 ${bgColors[type]}`}>
            <span className="material-symbols-outlined text-2xl theme-transition-none">
                {icons[type]}
            </span>
            <p className="font-medium pr-2">{message}</p>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
            </button>
        </div>
    );
};

export default Toast;
