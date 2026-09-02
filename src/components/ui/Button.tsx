import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  icon,
  iconPosition = 'right',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-touch';

  const sizeStyles = {
    sm: 'text-xs sm:text-sm px-4 py-2.5 gap-2',
    md: 'text-sm sm:text-base px-5 py-3 gap-2.5 shadow-2xs',
    lg: 'text-base px-6 sm:px-7 py-3.5 gap-3 shadow-sm',
  };

  const variantStyles = {
    primary: 'bg-burgundy text-ivory hover:bg-burgundy-700 active:bg-burgundy-800 focus:ring-burgundy/40 shadow-sm hover:shadow transition-transform active:scale-[0.99]',
    secondary: 'bg-ivory-200 text-charcoal border border-beige hover:bg-ivory-300 hover:border-beige-300 active:bg-ivory-300 focus:ring-beige-300/40',
    outline: 'bg-transparent text-charcoal border border-beige-300 hover:border-burgundy/40 hover:bg-burgundy-50/50 hover:text-burgundy focus:ring-burgundy/30',
    ghost: 'bg-transparent text-charcoal hover:bg-ivory-200 hover:text-burgundy focus:ring-charcoal/20',
    gold: 'bg-gold text-white hover:bg-gold-500 active:bg-gold-600 focus:ring-gold/40 shadow-sm',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
