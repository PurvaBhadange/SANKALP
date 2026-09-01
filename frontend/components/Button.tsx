import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'violet';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...rest }) => {
  const baseClasses = 'inline-flex items-center justify-center font-black uppercase tracking-wider text-sm border-4 border-black transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:pointer-events-none px-5 py-2.5';
  const variants: Record<string, string> = {
    primary: 'bg-[#FF6B6B] text-black shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    secondary: 'bg-[#FFD93D] text-black shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    violet: 'bg-[#C4B5FD] text-black shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    ghost: 'bg-white text-black shadow-[4px_4px_0px_0px_#000000] hover:bg-[#FFD93D] active:translate-x-1 active:translate-y-1 active:shadow-none',
  };
  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};
