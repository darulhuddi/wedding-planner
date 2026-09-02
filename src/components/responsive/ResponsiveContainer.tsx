import React from 'react';

export interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  noPadding?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  size = 'lg',
  noPadding = false,
  ...props
}) => {
  const sizeStyles = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-container', // 1240px
    full: 'max-w-full',
  };

  const paddingStyle = noPadding ? '' : 'px-4 sm:px-6 md:px-8 lg:px-12';

  return (
    <div
      className={`w-full mx-auto ${sizeStyles[size]} ${paddingStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
