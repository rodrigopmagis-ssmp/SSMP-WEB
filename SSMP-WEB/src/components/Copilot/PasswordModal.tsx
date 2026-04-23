import React, { useState } from 'react';
import { supabaseService } from '../../services/supabaseService';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const isValid = await supabaseService.verifyPassword(password);
            if (isValid) {
                // Call success and reset, but ensure we don't crash if unmounted
                onSuccess();
                setPassword('');
            } else {
                setError('Senha incorreta. Tente novamente.');
            }
        } catch (err: any) {
            console.error('Password verification error:', err);
            setError(err.message || 'Erro ao validar senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 shadow-inner">
                            <span className="material-symbols-outlined text-3xl">lock</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                            Segurança Ana
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Para visualizar esta consulta, por favor confirme sua senha de acesso.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Sua senha..."
                                autoFocus
                                className={`w-full px-4 py-4 bg-gray-50 dark:bg-black/20 border ${error ? 'border-red-300' : 'border-gray-100 dark:border-white/5'} rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-medium`}
                            />
                            {error && (
                                <p className="text-[11px] font-bold text-red-500 mt-2 ml-1 uppercase tracking-wider animate-in slide-in-from-top-1">
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !password}
                                className="flex-1 px-4 py-4 bg-rose-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Confirmar
                                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600 opacity-50" />
            </div>
        </div>
    );
};
