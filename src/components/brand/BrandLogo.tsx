import React from 'react';
import { BrandMark, BrandMarkVariant, BrandMarkSize } from './BrandMark';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dark' | 'light' | 'monochrome';
  markVariant?: BrandMarkVariant;
  markOnly?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => void;
  ariaLabel?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'default',
  markVariant,
  markOnly = false,
  className = '',
  markClassName = '',
  textClassName = '',
  onClick,
  ariaLabel = 'WedSiap',
}) => {
  // Determine mark size
  const markSize: BrandMarkSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : 'md';

  // Determine mark variant if not explicitly specified
  const resolvedMarkVariant: BrandMarkVariant =
    markVariant ||
    (variant === 'dark' ? 'maroon' : variant === 'light' ? 'light' : variant === 'monochrome' ? 'monochrome-dark' : 'maroon');

  // Text size classes
  const textSizeClass =
    size === 'sm'
      ? 'text-lg'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'xl'
      ? 'text-3xl sm:text-4xl'
      : 'text-xl sm:text-2xl'; // md (standard)

  // Text color classes based on background variant
  let wedColorClass = 'text-charcoal';
  let siapColorClass = 'text-burgundy';

  if (variant === 'dark') {
    wedColorClass = 'text-ivory-50';
    siapColorClass = 'text-burgundy-300';
  } else if (variant === 'monochrome') {
    wedColorClass = 'text-charcoal-900';
    siapColorClass = 'text-charcoal-700';
  }

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      <BrandMark
        size={markSize}
        variant={resolvedMarkVariant}
        className={`shadow-xs transition-transform group-hover:scale-105 ${markClassName}`}
      />

      {!markOnly && (
        <span
          className={`font-serif font-bold tracking-tight leading-none select-none ${textSizeClass} ${wedColorClass} ${textClassName}`}
        >
          Wed<span className={siapColorClass}>Siap</span>
        </span>
      )}
    </div>
  );

  return content;
};
