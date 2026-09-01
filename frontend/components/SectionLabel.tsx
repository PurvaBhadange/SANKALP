import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 border-3 border-black bg-[#FFD93D] text-black text-xs font-black uppercase tracking-widest -rotate-2 shadow-[3px_3px_0px_0px_#000000] ${className}`}>
      <span className="w-2 h-2 rounded-full bg-black"></span>
      {children}
    </div>
  );
};
