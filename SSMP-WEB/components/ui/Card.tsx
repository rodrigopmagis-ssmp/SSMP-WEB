import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-[#2d181e] rounded-xl shadow-sm border border-[#f3e7ea] dark:border-[#3d242a] p-6 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
