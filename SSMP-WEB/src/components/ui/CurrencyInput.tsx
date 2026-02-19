import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

export function CurrencyInput({ value, onChange, className, placeholder, disabled }: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Format initial value or external updates
        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value || 0);
        setDisplayValue(formatted);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputVal = e.target.value;
        // Remove non-digit characters
        const digits = inputVal.replace(/\D/g, '');

        // Convert to number (divide by 100 for cents)
        const numberValue = parseInt(digits || '0', 10) / 100;

        // Update parent with numeric value
        onChange(numberValue);

        // Update local display immediately
        // Note: The useEffect will also trigger, but this ensures immediate feedback for the user
        // Wait, if useEffect triggers, it might double render or jump cursor.
        // Actually, for controlled input, relying on useEffect is safer if parent updates value.
        // But for smooth typing, we might want to update local state too.
        // However, standard "ATM" style usually works best by just calculating from digits.
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
        />
    );
}
