import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    className = '',
    children,
    ...props
}) => {
    const baseStyles = "flex items-center justify-center gap-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-primary text-white hover:bg-[#d6335c] shadow-lg shadow-primary/20",
        secondary: "bg-primary/10 text-primary hover:bg-primary/20",
        outline: "border border-gray-200 text-gray-600 hover:bg-gray-50",
        ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
    };

    const sizes = "px-4 py-2 text-sm"; // Default size, can be expanded

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
