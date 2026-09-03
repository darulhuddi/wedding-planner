import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { NextBestAction } from '../../types/onboarding';
import { Button } from '../ui/Button';

export interface NextBestActionCardProps {
  action: NextBestAction;
  userPriority: string;
  onTakeAction: (targetRoute: string) => void;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  action,
  userPriority,
  onTakeAction,
}) => {
  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'budget': return 'Budget';
      case 'checklist': return 'Checklist';
      case 'vendor': return 'Vendor';
      case 'timeline': return 'Timeline';
      default: return priority || 'Belum dipilih';
    }
  };

  const getTargetRoute = (): string => {
    if (action.type === 'budget') return 'budget';
    if (action.type === 'checklist') return 'checklist';
    if (action.type === 'timeline') return 'timeline';
    if (action.type === 'task') return 'checklist';
    if (action.category) return action.category;
    return 'checklist';
  };

  return (
    <div className="bg-white border border-burgundy-200/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden space-y-4">
      {/* Top Meta Strip: User Priority vs WedFlow Tag */}
      <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-burgundy text-ivory flex items-center justify-center text-xs font-bold shrink-0">
            ★
          </span>
          <span className="text-xs sm:text-sm font-medium text-charcoal-500">
            Fokus pilihanmu: <strong className="text-charcoal uppercase font-bold">{getPriorityDisplay(userPriority)}</strong>
          </span>
        </div>

        <span className="text-xs font-semibold bg-burgundy-50 text-burgundy px-3.5 py-1 rounded-full border border-burgundy-200 shadow-2xs">
          {action.priorityTag}
        </span>
      </div>

      {/* Primary Action Callout */}
      <div className="relative z-10 space-y-2 max-w-4xl">
        <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-gold-600 block">
          Langkah pertama yang kami sarankan:
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight leading-snug">
          {action.title}
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed max-w-3xl">
          {action.description}
        </p>

        {action.reason && (
          <div className="pt-1">
            <p className="text-xs text-burgundy font-medium flex items-center gap-2 bg-ivory-50 px-3.5 py-2 rounded-xl border border-beige inline-flex max-w-full">
              <Sparkles className="w-3.5 h-3.5 text-gold-600 shrink-0" />
              <span>Alasan WedFlow: {action.reason}</span>
            </p>
          </div>
        )}
      </div>

      {/* Action CTA Button */}
      <div className="pt-3 relative z-10 flex items-center justify-between gap-4 flex-wrap border-t border-beige">
        <Button
          variant="primary"
          size="md"
          onClick={() => onTakeAction(getTargetRoute())}
          icon={<ArrowRight className="w-4 h-4" />}
          className="px-6 py-2.5 text-sm font-semibold shadow-2xs cursor-pointer"
        >
          {action.type === 'task' ? 'Buka Tugas' : 'Mulai Sekarang'}
        </Button>

        <span className="text-xs text-charcoal-400">
          ✓ Rekomendasi otomatis berdasarkan kondisi wedding-mu
        </span>
      </div>

    </div>
  );
};
