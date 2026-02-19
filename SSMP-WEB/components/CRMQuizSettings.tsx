import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { QuizEditor, Question } from './QuizEditor';

const CRMQuizSettings: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [finalScreen, setFinalScreen] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const config = await supabaseService.getQuizConfig();
            if (config) {
                if (config.questions) setQuestions(config.questions);
                if (config.final_screen) setFinalScreen(config.final_screen);
            }
        } catch (err) {
            console.error('Error loading quiz config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedQuestions: Question[], updatedFinalScreen: any) => {
        try {
            setSaving(true);
            await supabaseService.saveQuizConfig(updatedQuestions, updatedFinalScreen);
            alert('Configurações salvas com sucesso!');
            // Update local state to reflect saved data
            setQuestions(updatedQuestions);
            setFinalScreen(updatedFinalScreen);
        } catch (err) {
            console.error('Error saving quiz config:', err);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <QuizEditor
            initialQuestions={questions}
            initialFinalScreen={finalScreen}
            onSave={handleSave}
            loading={loading}
            saving={saving}
        />
    );
};

export default CRMQuizSettings;
