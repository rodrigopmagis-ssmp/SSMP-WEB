import { useEffect } from 'react';
import { autoLossService } from '../src/services/autoLossService';

/**
 * Hook para gerenciar o serviço de Auto-Loss.
 * Executa a verificação de negócios estagnados periodicamente ou na inicialização.
 */
export function useAutoLoss() {
    useEffect(() => {
        // Evitar execução excessiva: verificar apenas se não rodou na última hora
        const lastRun = localStorage.getItem('last_autoloss_run');
        const now = new Date().getTime();
        const ONE_HOUR = 60 * 60 * 1000;

        if (!lastRun || (now - parseInt(lastRun)) > ONE_HOUR) {
            autoLossService.processarNegociosEstagnados()
                .then((count) => {
                    if (count > 0) {
                        console.log(`Auto-Loss executado. ${count} negócios arquivados.`);
                    }
                    localStorage.setItem('last_autoloss_run', now.toString());
                })
                .catch(err => console.error('Erro no Auto-Loss:', err));
        }
    }, []);
}
