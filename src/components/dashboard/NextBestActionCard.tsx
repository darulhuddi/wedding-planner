import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { NextBestAction } from '../../types/onboarding';

export interface NextBestActionCardProps {
  action: NextBestAction;
  userPriority?: string;
  onTakeAction: (targetRoute: string, actionType?: string) => void;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  action,
  onTakeAction,
}) => {
  const getTargetRoute = (): string => {
    if (action.target) return action.target;
    if (action.type === 'administration') return 'administration';
    if (action.type === 'budget') return 'budget';
    if (action.type === 'guests') return 'guests';
    if (action.type === 'checklist') return 'checklist';
    if (action.type === 'timeline') return 'timeline';
    if (action.type === 'events') return 'dashboard';
    if (action.type === 'identity') return 'dashboard';
    if (action.type === 'task') return action.actionType === 'OPEN_ADMIN_TASK' || (action.category as string) === 'prosesi_administrasi' ? 'administration' : 'checklist';
    if (action.category) return action.category;
    return 'checklist';
  };

  // Human friendly reason format: "Kenapa sekarang? <reason>"
  const reasonText = action.reason 
    ? (action.reason.toLowerCase().startsWith('kenapa sekarang?')
        ? action.reason.replace(/^kenapa sekarang\?\s*/i, '')
        : action.reason)
    : 'Deadline tugas ini sudah dekat.';

  const ctaLabel = action.ctaLabel || 'Buka Tugas';

  return (
    <div className="w-full max-w-full box-border bg-white border border-burgundy-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-9 shadow-card relative overflow-hidden">
      
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 sm:gap-6 relative z-10 w-full min-w-0 box-border">
        
        {/* Left: Star Icon + Recommendation Content */}
        <div className="flex flex-col sm:flex-row items-start gap-3.5 sm:gap-5 flex-1 min-w-0 w-full box-border">
          
          {/* Star Badge Icon + Eyebrow */}
          <div className="flex items-center gap-2.5 sm:block shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-burgundy text-white flex items-center justify-center font-bold text-sm sm:text-lg shadow-xs shrink-0 sm:mt-1">
              <span>★</span>
            </div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-burgundy sm:hidden">
              Langkahmu Berikutnya
            </span>
          </div>

          <div className="space-y-2 sm:space-y-2.5 min-w-0 flex-1 w-full box-border">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="hidden sm:block text-[11px] uppercase font-bold tracking-widest text-burgundy">
                Langkahmu Berikutnya
              </span>
              {action.priorityTag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-ivory-100 text-charcoal-600 border border-beige">
                  {action.priorityTag}
                </span>
              )}
            </div>

            <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal tracking-tight leading-snug break-words w-full">
              {action.title}
            </h2>

            <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed max-w-2xl break-words w-full">
              {action.description}
            </p>

            {/* "Kenapa sekarang?" Reason Callout */}
            <div className="pt-1 w-full">
              <div className="flex items-start gap-2.5 p-3 sm:py-2.5 sm:px-3.5 rounded-xl bg-ivory-50 border border-beige text-xs text-charcoal-600 w-full box-border">
                <Clock className="w-4 h-4 text-burgundy shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 break-words leading-relaxed text-xs">
                  <strong className="text-burgundy font-semibold">Kenapa sekarang?</strong>{' '}
                  <span className="text-charcoal-600">{reasonText}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right: CTA Button & Graphic Illustration */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 sm:gap-4 shrink-0 w-full lg:w-auto pt-3 sm:pt-4 lg:pt-0 border-t lg:border-t-0 border-beige box-border">
          
          {/* Subtle Graphic Illustration (Cloche & Clipboard Vector on Large Screens) */}
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
            onClick={() => onTakeAction(getTargetRoute(), action.actionType)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3 bg-burgundy hover:bg-burgundy-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-xs cursor-pointer min-h-touch whitespace-nowrap"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

      </div>

    </div>
  );
};
