import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', containerClassName = '', ...rest }) => {
  const baseClasses = 'w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:outline-none focus:bg-[#FFD93D] focus:shadow-[4px_4px_0px_0px_#000000] transition-all duration-100';
  return (
    <div className={containerClassName}>
      {label && <label className="block mb-1 text-xs font-black uppercase tracking-wider text-black">{label}</label>}
      <input className={`${baseClasses} ${className}`} {...rest} />
    </div>
  );
};
