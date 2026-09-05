import React from 'react';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-gold-600 block">
            {eyebrow}
          </span>
        )}
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-0.5">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-charcoal-400 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
};
