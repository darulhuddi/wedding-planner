import React, { useCallback } from 'react';
import { Calendar, Check, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { TaskItem } from '../../types/checklist';
import {
  toggleTaskComplete,
  getUpcomingTasks,
  formatDueDateLabel,
  getTodayStr,
  TASK_CATEGORY_LABELS,
} from '../../utils/checklistUtils';

export interface UpcomingTasksProps {
  /** Shared task state from App.tsx — same array used by ChecklistPage */
  tasks: TaskItem[];
  /** Callback to propagate mutations up to App.tsx (which saves to repository) */
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  onViewAllChecklist: () => void;
}

export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({
  tasks,
  onTaskChange,
  onViewAllChecklist,
}) => {
  const handleToggle = useCallback((id: string) => {
    onTaskChange(toggleTaskComplete(tasks, id));
  }, [tasks, onTaskChange]);

  const upcoming = getUpcomingTasks(tasks, 4);
  const today = getTodayStr();

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige-300 shadow-card space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-beige">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-burgundy shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
              Ringkasan Aksi
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Tugas Mendatang
            </h3>
          </div>
        </div>

        <button
          onClick={onViewAllChecklist}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700
            flex items-center gap-1 transition-colors min-h-touch cursor-pointer"
        >
          <span>Lihat semua</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {upcoming.length === 0 ? (
          <div className="py-4 text-center text-sm text-charcoal-400 italic">
            Semua tugas aktif sudah selesai 🎉
          </div>
        ) : (
          upcoming.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && task.dueDate !== null && task.dueDate < today;
            const isToday = !isCompleted && task.dueDate === today;
            const dueDateLabel = formatDueDateLabel(task.dueDate);

            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task.id)}
                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border
                  transition-all duration-200 cursor-pointer min-h-touch
                  ${isCompleted
                    ? 'bg-ivory-50/70 border-beige-200 opacity-60'
                    : isOverdue
                    ? 'bg-white border-rose-200 hover:border-rose-300 shadow-xs'
                    : isToday
                    ? 'bg-white border-gold-200 hover:border-gold-300'
                    : 'bg-white border-beige hover:border-beige-300'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0
                      transition-all border
                      ${isCompleted
                        ? 'bg-burgundy border-burgundy text-white'
                        : 'border-charcoal-300 hover:border-burgundy bg-white'
                      }`}
                    aria-label={`Tandai ${task.title}`}
                  >
                    {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </button>
                  <div className="min-w-0">
                    <span className={`text-xs sm:text-sm font-medium leading-snug break-words block
                      ${isCompleted ? 'line-through text-charcoal-300' : 'text-charcoal'}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-charcoal-400 mt-0.5 flex-wrap">
                      <span>{TASK_CATEGORY_LABELS[task.category]}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium
                    px-2.5 py-0.5 rounded-full
                    ${isCompleted
                      ? 'bg-emerald-50 text-emerald-700'
                      : isOverdue
                      ? 'bg-rose-50 text-rose-600 font-semibold'
                      : isToday
                      ? 'bg-gold-50 text-gold-700 font-semibold'
                      : 'bg-ivory-200 text-charcoal-400'
                    }`}>
                    {isOverdue
                      ? <AlertCircle className="w-3 h-3 shrink-0" />
                      : <Clock className="w-3 h-3 shrink-0" />}
                    <span>{isCompleted ? 'Selesai' : dueDateLabel}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
