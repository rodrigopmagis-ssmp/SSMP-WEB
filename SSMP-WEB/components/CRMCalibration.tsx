import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const CRMCalibration: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        frio_max: 50,
        morno_max: 75,
        quente_max: 90 // Above this is Ultra Quente
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await supabaseService.getCRMSettings('lead_scoring');
            if (data) {
                setSettings({
                    frio_max: data.frio_max ?? 50,
                    morno_max: data.morno_max ?? 75,
                    quente_max: data.quente_max ?? 90
                });
            }
        } catch (error) {
            console.error('Error loading calibration settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Ensure logical consistency
            // frio_max < morno_max < quente_max
            const safeSettings = {
                frio_max: Math.min(settings.frio_max, settings.morno_max - 5),
                morno_max: Math.min(Math.max(settings.morno_max, settings.frio_max + 5), settings.quente_max - 5),
                quente_max: Math.max(settings.quente_max, settings.morno_max + 5)
            };

            setSettings(safeSettings); // Update UI to safe values
            await supabaseService.updateCRMSettings('lead_scoring', safeSettings);
            alert('Calibração salva com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar calibração.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Icon name="progress_activity" className="animate-spin text-4xl text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 animate-fade-in pb-20">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="straighten" className="text-primary" />
                    Calibração de Leads
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Defina os limites de score para cada classificação. A IA usará esses valores para categorizar os leads.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">

                {/* Visual Ruler Container */}
                <div className="relative mb-16 pt-8 px-4">
                    {/* Background Track */}
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex w-full relative">
                        {/* Frio Zone */}
                        <div
                            className="h-full bg-blue-300 transition-all duration-300"
                            style={{ width: `${settings.frio_max}%` }}
                        />
                        {/* Morno Zone */}
                        <div
                            className="h-full bg-yellow-300 transition-all duration-300"
                            style={{ width: `${settings.morno_max - settings.frio_max}%` }}
                        />
                        {/* Quente Zone */}
                        <div
                            className="h-full bg-orange-400 transition-all duration-300"
                            style={{ width: `${settings.quente_max - settings.morno_max}%` }}
                        />
                        {/* Ultra Quente Zone */}
                        <div
                            className="h-full bg-red-500 transition-all duration-300 flex-1"
                        />
                    </div>

                    {/* Draggable Handles (Visual Only - interaction via range inputs below for better cross-handling) */}

                    {/* Handle 1: Frio/Morno */}
                    <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 -ml-2"
                        style={{ left: `${settings.frio_max}%` }}
                    >
                        <div className="w-1 h-8 bg-gray-800 dark:bg-white rounded-full mx-auto relative group cursor-col-resize z-20">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {settings.frio_max}
                            </div>
                        </div>
                    </div>

                    {/* Handle 2: Morno/Quente */}
                    <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 -ml-2"
                        style={{ left: `${settings.morno_max}%` }}
                    >
                        <div className="w-1 h-8 bg-gray-800 dark:bg-white rounded-full mx-auto relative group cursor-col-resize z-20">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {settings.morno_max}
                            </div>
                        </div>
                    </div>

                    {/* Handle 3: Quente/Ultra */}
                    <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 -ml-2"
                        style={{ left: `${settings.quente_max}%` }}
                    >
                        <div className="w-1 h-8 bg-gray-800 dark:bg-white rounded-full mx-auto relative group cursor-col-resize z-20">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {settings.quente_max}
                            </div>
                        </div>
                    </div>


                    {/* Range Inputs for Interaction (Stacked) */}
                    <input
                        type="range" min="0" max="100"
                        value={settings.frio_max}
                        onChange={(e) => setSettings({ ...settings, frio_max: Math.min(Number(e.target.value), settings.morno_max - 5) })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-10"
                        style={{ pointerEvents: 'none' }} // Tricky to handle multiple ranges on one track. 
                    // Instead, let's use the explicit number inputs as the primary refined interaction, 
                    // and perhaps single sliders per threshold below? 
                    // Stacking standard range inputs is notoriously hard for "multi-thumb".
                    // Let's stick to the visual ruler being read-only feedback for the Inputs below for simplicity and robustness.
                    />
                    {/* 
                      Actually, let's remove the "range" inputs overlay if we provide good number inputs.
                      The user specifically asked for "digitando os valores".
                      Let's focus on a nice grid of cards with number inputs that update the bar.
                    */}
                </div>


                {/* Configuration Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                    {/* Frio */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                                <Icon name="ac_unit" />
                            </span>
                            <h3 className="font-bold text-blue-900 dark:text-blue-100">Lead Frio</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-blue-800 dark:text-blue-200 uppercase font-bold">Máximo Score</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={settings.frio_max}
                                    onChange={(e) => setSettings({ ...settings, frio_max: Number(e.target.value) })}
                                    className="w-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-lg font-bold text-blue-900 dark:text-blue-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Até {settings.frio_max}. Curiosos ou sem prazo.
                            </p>
                        </div>
                    </div>

                    {/* Morno */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">
                                <Icon name="local_cafe" />
                            </span>
                            <h3 className="font-bold text-yellow-900 dark:text-yellow-100">Lead Morno</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-yellow-800 dark:text-yellow-200 uppercase font-bold">Máximo Score</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={settings.morno_max}
                                    onChange={(e) => setSettings({ ...settings, morno_max: Number(e.target.value) })}
                                    className="w-full bg-white dark:bg-gray-900 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 text-lg font-bold text-yellow-900 dark:text-yellow-100 focus:ring-2 focus:ring-yellow-500 outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                De {settings.frio_max} até {settings.morno_max}. Dúvidas ou restrições.
                            </p>
                        </div>
                    </div>

                    {/* Quente */}
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                                <Icon name="local_fire_department" />
                            </span>
                            <h3 className="font-bold text-orange-900 dark:text-orange-100">Lead Quente</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-orange-800 dark:text-orange-200 uppercase font-bold">Máximo Score</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={settings.quente_max}
                                    onChange={(e) => setSettings({ ...settings, quente_max: Number(e.target.value) })}
                                    className="w-full bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-lg font-bold text-orange-900 dark:text-orange-100 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                De {settings.morno_max} até {settings.quente_max}. Alta intenção.
                            </p>
                        </div>
                    </div>

                    {/* Ultra Quente */}
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-red-100 text-red-600 p-2 rounded-lg">
                                <Icon name="whatshot" />
                            </span>
                            <h3 className="font-bold text-red-900 dark:text-red-100">Ultra Quente</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-red-800 dark:text-red-200 uppercase font-bold">Score Mínimo</label>
                            <div className="flex items-center gap-2">
                                <div className="w-full bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-lg font-bold text-red-900 dark:text-red-100 opacity-80 cursor-not-allowed">
                                    {settings.quente_max}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Acima de {settings.quente_max} até 100. Urgência Imediata.
                            </p>
                        </div>
                    </div>

                </div>

                <div className="mt-12 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Icon name="progress_activity" className="animate-spin" />
                        ) : (
                            <Icon name="save" />
                        )}
                        Salvar Calibração
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CRMCalibration;
