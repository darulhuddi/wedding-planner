import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string;
  subvalue?: string;
  icon?: React.ReactNode;
  progress?: number;
  badge?: {
    text: string;
    variant?: 'burgundy' | 'gold' | 'beige' | 'success' | 'warning';
  };
  className?: string;
  accentBorder?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subvalue,
  icon,
  progress,
  badge,
  className = '',
  accentBorder = false
}) => {
  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border ${accentBorder ? 'border-burgundy-200 shadow-soft' : 'border-beige shadow-soft'} transition-all duration-200 hover:shadow-card ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs sm:text-sm font-medium text-charcoal-400">
          {label}
        </span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-ivory-200 flex items-center justify-center text-charcoal-500 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-charcoal tracking-tight">
          {value}
        </span>
        {subvalue && (
          <span className="text-xs text-charcoal-300 font-normal">
            {subvalue}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-ivory-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-burgundy h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {badge && (
        <div className="mt-3 pt-2.5 border-t border-beige-100 flex items-center justify-between text-xs">
          <span className="text-charcoal-300">Status</span>
          <span className="font-medium text-burgundy bg-burgundy-50 px-2 py-0.5 rounded-full text-[11px]">
            {badge.text}
          </span>
        </div>
      )}
    </div>
  );
};
