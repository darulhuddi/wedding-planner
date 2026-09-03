import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { NextBestAction } from '../../types/onboarding';

export interface NextBestActionCardProps {
  action: NextBestAction;
  userPriority?: string;
  onTakeAction: (targetRoute: string) => void;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  action,
  onTakeAction,
}) => {
  const getTargetRoute = (): string => {
    if (action.type === 'budget') return 'budget';
    if (action.type === 'checklist') return 'checklist';
    if (action.type === 'timeline') return 'timeline';
    if (action.type === 'task') return 'checklist';
    if (action.category) return action.category;
    return 'checklist';
  };

  // Human friendly reason format: "Kenapa sekarang? <reason>"
  const reasonText = action.reason 
    ? (action.reason.toLowerCase().startsWith('kenapa sekarang?')
        ? action.reason
        : action.reason)
    : 'Deadline tugas ini sudah dekat.';

  return (
    <div className="bg-white border border-burgundy-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-9 shadow-card relative overflow-hidden">
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        
        {/* Left: Star Icon + Recommendation Content */}
        <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
          
          {/* Star Badge Icon */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-burgundy text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0 mt-1">
            <span>★</span>
          </div>

          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-[11px] uppercase font-bold tracking-widest text-burgundy block">
              Langkahmu Berikutnya
            </span>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight leading-snug">
              {action.title}
            </h2>

            <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed max-w-2xl">
              {action.description}
            </p>

            {/* "Kenapa sekarang?" Reason Chip */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ivory-50 border border-beige text-xs text-charcoal-600 max-w-full">
                <Clock className="w-3.5 h-3.5 text-burgundy shrink-0" />
                <span className="truncate">
                  <strong className="text-burgundy font-semibold">Kenapa sekarang?</strong>{' '}
                  {reasonText}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Visual Accent + CTA Button */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-beige">
          
          {/* Subtle Graphic Illustration (Cloche & Clipboard Vector) */}
          <div className="hidden xl:flex items-center gap-3 opacity-90 pr-2">
            <svg className="w-24 h-16 text-beige-400" viewBox="0 0 100 60" fill="none">
              {/* Cloche Base */}
              <ellipse cx="45" cy="48" rx="35" ry="5" fill="#E9E1D6" />
              <path d="M15 48 C 15 25, 75 25, 75 48 Z" fill="#FAF8F3" stroke="#B89A70" strokeWidth="1.5" />
              <circle cx="45" cy="22" r="3.5" fill="#B89A70" />
              {/* Clipboard */}
              <rect x="58" y="16" width="28" height="36" rx="3" fill="#FFFFFF" stroke="#B89A70" strokeWidth="1.5" transform="rotate(8 58 16)" />
              <rect x="67" y="14" width="10" height="4" rx="1.5" fill="#71343B" transform="rotate(8 67 14)" />
              <line x1="64" y1="26" x2="80" y2="28" stroke="#E9E1D6" strokeWidth="1.5" />
              <line x1="64" y1="32" x2="78" y2="34" stroke="#E9E1D6" strokeWidth="1.5" />
              <line x1="64" y1="38" x2="74" y2="40" stroke="#71343B" strokeWidth="1.5" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => onTakeAction(getTargetRoute())}
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-burgundy hover:bg-burgundy-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-xs cursor-pointer min-h-touch whitespace-nowrap self-start sm:self-auto"
          >
            <span>Buka Tugas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
