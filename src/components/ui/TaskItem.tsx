import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { Badge } from './Badge';

export interface TaskItemProps {
  id: string;
  title: string;
  category: string;
  dueInDays: string;
  isUrgent?: boolean;
  isCompleted?: boolean;
  assignedTo?: string;
  amount?: number;
  onToggle?: (id: string) => void;
  interactive?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  id,
  title,
  category,
  dueInDays,
  isUrgent = false,
  isCompleted = false,
  assignedTo,
  onToggle,
  interactive = true
}) => {
  const handleClick = () => {
    if (interactive && onToggle) {
      onToggle(id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-200 min-h-touch ${
        isCompleted
          ? 'bg-ivory-50/60 border-beige-200 opacity-70'
          : isUrgent
          ? 'bg-white border-burgundy-200 shadow-soft hover:border-burgundy-300'
          : 'bg-white border-beige shadow-soft hover:border-beige-300'
      } ${interactive ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        {/* Checkbox button with comfortable touch hit area */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (interactive && onToggle) onToggle(id);
          }}
          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all ${
            isCompleted
              ? 'bg-burgundy border-burgundy text-white'
              : isUrgent
              ? 'border-burgundy/60 hover:border-burgundy bg-burgundy-50/30'
              : 'border-charcoal-300 hover:border-charcoal-500 bg-white'
          }`}
          aria-label={isCompleted ? `Tandai belum selesai: ${title}` : `Tandai selesai: ${title}`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm font-medium leading-snug break-words transition-colors ${
              isCompleted
                ? 'line-through text-charcoal-300'
                : 'text-charcoal group-hover:text-burgundy'
            }`}
          >
            {title}
          </p>

          <div className="flex items-center gap-2 mt-1 text-xs text-charcoal-400 flex-wrap">
            <Badge variant="beige" size="sm">
              {category}
            </Badge>
            {assignedTo && (
              <span className="text-[11px] text-charcoal-400">
                PIC: <strong className="font-medium text-charcoal-500">{assignedTo}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Due badge */}
      <div className="shrink-0 flex flex-col items-end">
        <span
          className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium px-2.5 py-1 rounded-full ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700'
              : isUrgent
              ? 'bg-burgundy-50 text-burgundy font-semibold border border-burgundy-200/50'
              : 'bg-ivory-200 text-charcoal-400'
          }`}
        >
          {isUrgent && !isCompleted ? (
            <AlertCircle className="w-3 h-3 text-burgundy shrink-0" />
          ) : (
            <Clock className="w-3 h-3 text-charcoal-300 shrink-0" />
          )}
          <span>{isCompleted ? 'Selesai' : dueInDays}</span>
        </span>
      </div>
    </div>
  );
};
