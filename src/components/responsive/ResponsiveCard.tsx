import React from 'react';

export interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'white' | 'ivory' | 'burgundy' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  className?: string;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  variant = 'white',
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    white: 'bg-white border border-beige shadow-soft',
    ivory: 'bg-ivory-50/70 border border-beige shadow-soft',
    burgundy: 'bg-burgundy text-white border border-burgundy-700 shadow-md',
    outline: 'bg-transparent border border-beige-300',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6 lg:p-7',
    lg: 'p-5 sm:p-8 lg:p-10',
  };

  const hoverStyle = hoverable
    ? 'transition-all duration-200 hover:shadow-card hover:border-beige-300 active:scale-[0.99]'
    : '';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
