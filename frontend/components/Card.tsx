import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'yellow' | 'violet' | 'red';
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'white', ...rest }) => {
  const variantStyles: Record<string, string> = {
    white: 'bg-white',
    yellow: 'bg-[#FFD93D]',
    violet: 'bg-[#C4B5FD]',
    red: 'bg-[#FF6B6B]',
  };
  const baseClasses = 'border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000000] transition-all duration-150';
  return (
    <div className={`${baseClasses} ${variantStyles[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
};
