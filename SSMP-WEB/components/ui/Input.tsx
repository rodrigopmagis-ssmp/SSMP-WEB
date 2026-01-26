import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    ...props
}) => {
    return (
        <label className="flex flex-col gap-2 w-full">
            {label && (
                <span className="text-sm font-bold text-[#1b0d11] dark:text-white">
                    {label}
                </span>
            )}
            <input
                className={`rounded-xl border-[#e7cfd5] dark:border-[#4d3239] bg-background-light dark:bg-[#3d242a] focus:ring-primary focus:border-primary h-12 px-4 outline-none transition-all ${error ? 'border-red-500' : ''} ${className}`}
                {...props}
            />
            {error && <span className="text-xs text-red-500">{error}</span>}
        </label>
    );
};

export default Input;
