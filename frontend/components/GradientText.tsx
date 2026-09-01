import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  bgColor?: string;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  bgColor = 'bg-[#FFD93D]',
}) => {
  return (
    <span className={`inline-block border-2 border-black ${bgColor} text-black px-2 py-0.5 shadow-[3px_3px_0px_0px_#000000] -rotate-1 font-black ${className}`}>
      {children}
    </span>
  );
};
