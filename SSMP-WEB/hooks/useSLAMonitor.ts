import { useState, useEffect } from 'react';
import { Negocio } from '../types';
import { getSLAUrgencyLevel } from '../utils/slaCalculator';

/**
 * Hook para monitorar SLA em tempo real
 * Atualiza a cada 30 segundos para detectar violações
 */
export function useSLAMonitor(negocios: Negocio[]) {
    const [violations, setViolations] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);

    useEffect(() => {
        const checkSLA = () => {
            const newViolations: string[] = [];
            const newWarnings: string[] = [];

            negocios.forEach(negocio => {
                // Ignorar negócios já finalizados
                if (negocio.estagio === 'ganho' || negocio.estagio === 'perdido' || negocio.estagio === 'consulta_realizada') {
                    return;
                }

                const level = getSLAUrgencyLevel(negocio);

                if (level === 'critical') {
                    newViolations.push(negocio.id);
                } else if (level === 'warning') {
                    newWarnings.push(negocio.id);
                }
            });

            setViolations(newViolations);
            setWarnings(newWarnings);
        };

        // Verificar imediatamente
        checkSLA();

        // Verificar a cada 30 segundos
        const interval = setInterval(checkSLA, 30000);

        return () => clearInterval(interval);
    }, [negocios]);

    return { violations, warnings };
}
