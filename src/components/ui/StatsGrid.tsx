import React from 'react';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  subvalue?: string;
  supportingText?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  badgeText?: string;
  badgeVariant?: 'emerald' | 'amber' | 'burgundy' | 'charcoal';
  valueColor?: string;
}

export interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  columns = 4,
  className = '',
}) => {
  const colClass =
    columns === 4
      ? 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'
      : columns === 3
      ? 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'
      : 'grid grid-cols-2 gap-3 sm:gap-4';

  return (
    <div className={`${colClass} ${className}`}>
      {stats.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider flex items-center gap-1.5 truncate">
              {item.label}
            </span>
            {item.icon && (
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  item.iconBg || 'bg-ivory-100 border-beige text-charcoal'
                }`}
              >
                {item.icon}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-sans font-bold text-2xl sm:text-3xl tracking-tight leading-tight ${
                  item.valueColor || 'text-charcoal'
                }`}
              >
                {item.value}
              </span>
              {item.subvalue && (
                <span className="text-xs font-sans font-normal text-charcoal-400">
                  {item.subvalue}
                </span>
              )}
            </div>

            {item.supportingText && (
              <p className="text-[11px] text-charcoal-400 mt-0.5 leading-snug">
                {item.supportingText}
              </p>
            )}
          </div>

          {item.badgeText && (
            <div className="mt-2.5 pt-2 border-t border-beige/60 flex items-center justify-between">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase">Status</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  item.badgeVariant === 'emerald'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                    : item.badgeVariant === 'amber'
                    ? 'text-amber-700 bg-amber-50 border-amber-100'
                    : item.badgeVariant === 'burgundy'
                    ? 'text-burgundy bg-burgundy-50 border-burgundy-100'
                    : 'text-charcoal-500 bg-ivory-100 border-beige'
                }`}
              >
                {item.badgeText}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
