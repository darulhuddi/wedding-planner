import React from 'react';

export interface BadgeProps {
  variant?: 'burgundy' | 'gold' | 'beige' | 'success' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className = ''
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-3 py-1 font-medium',
  };

  const variantStyles = {
    burgundy: 'bg-burgundy-50 text-burgundy border border-burgundy-200/60',
    gold: 'bg-gold-50 text-gold-600 border border-gold-200/80',
    beige: 'bg-ivory-200 text-charcoal-500 border border-beige-300',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/70',
    neutral: 'bg-white text-charcoal-400 border border-beige',
  };

  const dotColors = {
    burgundy: 'bg-burgundy',
    gold: 'bg-gold',
    beige: 'bg-charcoal-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    neutral: 'bg-charcoal-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
