import React from 'react';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  titleAs?: 'h1' | 'h2' | 'h3';
  accentText?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
  titleAs: TitleTag = 'h2',
  accentText
}) => {
  const alignClass = align === 'center' ? 'text-center mx-auto items-center' : 'text-left items-start';

  return (
    <div className={`flex flex-col max-w-3xl ${alignClass} ${className}`}>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 mb-2.5">
          <span className="h-px w-5 bg-gold"></span>
          <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
            {eyebrow}
          </span>
          <span className="h-px w-5 bg-gold"></span>
        </div>
      )}
      <TitleTag className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-semibold text-charcoal leading-[1.18] tracking-tight">
        {title}
        {accentText && <span className="text-burgundy italic"> {accentText}</span>}
      </TitleTag>
      {subtitle && (
        <p className="mt-3 text-sm sm:text-base text-charcoal-400 font-normal leading-relaxed max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  );
};
