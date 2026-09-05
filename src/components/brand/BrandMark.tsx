import React from 'react';
import wedSiapLogoUrl from './WedSiapLogo.svg';

export type BrandMarkVariant = 
  | 'maroon'          // Official verbatim logo
  | 'light'
  | 'dark'
  | 'monochrome-light'
  | 'monochrome-dark'
  | 'transparent';

export type BrandMarkSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BrandMarkProps {
  size?: BrandMarkSize;
  variant?: BrandMarkVariant;
  className?: string;
  ariaLabel?: string;
}

const sizeMap: Record<BrandMarkSize, string> = {
  xs: 'w-4 h-4',               // 16px
  sm: 'w-6 h-6',               // 24px
  md: 'w-7 h-7 sm:w-8 sm:h-8', // 28-32px (standard navbar, sidebar & headers)
  lg: 'w-10 h-10',             // 40px
  xl: 'w-12 h-12',             // 48px
  '2xl': 'w-14 h-14',          // 56px
};

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'md',
  className = '',
  ariaLabel = 'WedSiap Logo',
}) => {
  const sizeClasses = sizeMap[size] || size;

  return (
    <img
      src={wedSiapLogoUrl}
      alt={ariaLabel}
      className={`shrink-0 select-none object-contain ${sizeClasses} ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    />
  );
};
