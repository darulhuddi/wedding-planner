import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { TaskItem } from '../../types/checklist';
import { CATEGORY_LABELS } from '../../domain/categories';
import { formatDueDateLabel, getTodayStr } from '../../utils/checklistUtils';

interface TaskRowProps {
  task: TaskItem;
  onToggle: (id: string) => void;
  onSelectTask: (task: TaskItem) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onSelectTask }) => {
  const today = getTodayStr();
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && task.dueDate !== null && task.dueDate < today;
  const isToday = !isCompleted && task.dueDate === today;
  const dueDateLabel = formatDueDateLabel(task.dueDate);

  return (
    <div
      onClick={() => onSelectTask(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTask(task);
        }
      }}
      aria-label={`Buka detail tugas: ${task.title}`}
      className={`group flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl border cursor-pointer
        transition-all duration-200 min-h-touch select-none
        ${
          isCompleted
            ? 'bg-ivory-50/50 border-beige-200/90 opacity-60 hover:opacity-80'
            : isOverdue
            ? 'bg-white border-rose-200/90 hover:border-rose-300 shadow-2xs'
            : isToday
            ? 'bg-white border-gold-200 hover:border-gold-300 shadow-2xs'
            : 'bg-white border-beige hover:border-beige-300 hover:shadow-2xs'
        }`}
    >
      {/* Checkbox with ~44px Touch Target Padding */}
      <div
        className="p-2 -m-2 flex items-center justify-center shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className={`w-5 h-5 rounded-md flex items-center justify-center
            transition-all duration-200 border focus:outline-none cursor-pointer
            ${
              isCompleted
                ? 'bg-burgundy border-burgundy text-white'
                : 'border-charcoal-300 bg-white group-hover:border-burgundy'
            }`}
          aria-label={`Tandai ${isCompleted ? 'belum selesai' : 'selesai'}: ${task.title}`}
        >
          {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
        </button>
      </div>

      {/* Main Content Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs sm:text-sm font-medium leading-snug break-words
          ${isCompleted ? 'line-through text-charcoal-300' : 'text-charcoal'}`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-charcoal-400 mt-0.5 flex-wrap">
          <span className="font-semibold text-charcoal-400">{CATEGORY_LABELS[task.category]}</span>
          {task.priority === 'high' && !isCompleted && (
            <>
              <span>·</span>
              <span className="text-burgundy font-semibold">Prioritas tinggi</span>
            </>
          )}
        </div>
      </div>

      {/* Due Date Badge */}
      <div className="shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium
          px-2.5 py-0.5 rounded-full whitespace-nowrap
          ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              : isOverdue
              ? 'bg-rose-50 text-rose-600 font-semibold border border-rose-200/60'
              : isToday
              ? 'bg-gold-50 text-gold-700 font-semibold border border-gold-200/60'
              : 'bg-ivory-100 text-charcoal-400 border border-beige'
          }`}
        >
          {isOverdue ? (
            <AlertCircle className="w-3 h-3 shrink-0 text-rose-500" />
          ) : (
            <Clock className="w-3 h-3 shrink-0 text-charcoal-400" />
          )}
          <span>{isCompleted ? 'Selesai' : dueDateLabel}</span>
        </span>
      </div>
    </div>
  );
};
