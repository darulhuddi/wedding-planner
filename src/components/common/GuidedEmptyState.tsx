import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface GuidedEmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: string;
  description: string;
  supportingText?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  };
  examplesTitle?: string;
  examples?: string[];
  examplesLayout?: 'chips' | 'cards';
  className?: string;
}

export const GuidedEmptyState: React.FC<GuidedEmptyStateProps> = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  supportingText,
  primaryAction,
  secondaryAction,
  examplesTitle,
  examples,
  examplesLayout = 'chips',
  className = '',
}) => {
  const PrimaryIcon = primaryAction?.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      data-testid="guided-empty-state"
      className={`bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 text-center border border-beige-300 shadow-card max-w-xl mx-auto my-6 sm:my-8 space-y-5 transition-all ${className}`}
    >
      {/* Icon */}
      {Icon && (
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto shadow-2xs">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
      )}

      {/* Eyebrow & Titles */}
      <div className="space-y-1.5 sm:space-y-2">
        {eyebrow && (
          <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-burgundy bg-burgundy-50 px-2.5 py-0.5 rounded-full border border-burgundy-100">
            {eyebrow}
          </span>
        )}
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-charcoal-400 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Supporting Text / Guidance Callout */}
      {supportingText && (
        <div className="bg-ivory-50 rounded-xl p-3 sm:p-3.5 border border-beige-200/80 text-left sm:text-center">
          <p className="text-xs sm:text-xs text-charcoal-500 leading-relaxed font-normal">
            {supportingText}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer min-h-touch"
            >
              {PrimaryIcon && <PrimaryIcon className="w-4 h-4" />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-beige-300 text-charcoal hover:bg-ivory-100 hover:text-burgundy transition-colors shadow-2xs cursor-pointer min-h-touch"
            >
              {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Presentation-only Examples */}
      {examples && examples.length > 0 && (
        <div className="pt-4 border-t border-beige-200 space-y-2.5 text-center">
          {examplesTitle && (
            <p className="text-[11px] sm:text-xs font-medium text-charcoal-400">
              {examplesTitle}
            </p>
          )}

          {examplesLayout === 'chips' ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {examples.map((example, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[11px] sm:text-xs font-medium bg-ivory-100/90 text-charcoal-500 px-3 py-1 rounded-lg border border-beige-200 select-none"
                >
                  {example}
                </span>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5 max-w-md mx-auto text-left">
              {examples.map((example, idx) => (
                <div
                  key={idx}
                  className="bg-ivory-50/80 px-3.5 py-2 rounded-xl border border-beige-200/70 text-charcoal-600 text-xs italic flex items-center gap-2 select-none"
                >
                  <span className="text-burgundy/60 text-base leading-none select-none font-serif">•</span>
                  <span>{example}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
