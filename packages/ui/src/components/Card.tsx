import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  const interactiveClasses = interactive
    ? 'hover:-translate-y-0.5 hover:shadow-lg hover:border-[#BE1E2E]/40 cursor-pointer transition-all'
    : '';

  return (
    <div
      className={`glass-card p-6 rounded-2xl ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
