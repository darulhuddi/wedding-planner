import React, { useCallback } from 'react';
import { Bookmark, ArrowRight, ChevronRight, Check } from 'lucide-react';
import { TaskItem } from '../../types/checklist';
import {
  toggleTaskComplete,
  getUpcomingTasks,
  formatDueDateLabel,
  TASK_CATEGORY_LABELS,
} from '../../utils/checklistUtils';

export interface UpcomingTasksProps {
  tasks: TaskItem[];
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

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card flex flex-col justify-between h-full space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Bookmark className="w-4 h-4 text-burgundy" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
            Tugas Berikutnya
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAllChecklist}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1 transition-colors min-h-touch cursor-pointer group"
        >
          <span>Lihat semua</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Numbered / List-Based Tasks */}
      <div className="space-y-2 flex-1">
        {upcoming.length === 0 ? (
          <div className="py-10 text-center text-xs sm:text-sm text-charcoal-400 italic">
            Semua tugas aktif sudah selesai 🎉
          </div>
        ) : (
          upcoming.map((task, index) => {
            const isFirst = index === 0;
            const isCompleted = task.status === 'completed';
            const dueDateLabel = formatDueDateLabel(task.dueDate);

            return (
              <div
                key={task.id}
                onClick={onViewAllChecklist}
                className="group flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-beige hover:border-beige-300 hover:bg-ivory-50/70 transition-all cursor-pointer gap-3"
              >
                {/* Number Badge & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                  {/* Number Circle Badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform group-hover:scale-105 ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isFirst
                      ? 'bg-burgundy text-white shadow-2xs'
                      : 'bg-ivory-100 text-charcoal-600 border border-beige-300'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </div>

                  <div className="min-w-0">
                    <span className={`text-xs sm:text-sm font-medium block truncate group-hover:text-burgundy transition-colors ${
                      isCompleted ? 'line-through text-charcoal-300' : 'text-charcoal'
                    }`}>
                      {task.title}
                    </span>
                    <span className="text-[11px] text-charcoal-400 block truncate">
                      {TASK_CATEGORY_LABELS[task.category] || task.category}
                    </span>
                  </div>
                </div>

                {/* Due Date Badge with Chevron */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isFirst
                      ? 'bg-burgundy-50 text-burgundy border-burgundy-200 font-semibold'
                      : 'bg-ivory-100 text-charcoal-500 border-beige'
                  }`}>
                    <span>{isCompleted ? 'Selesai' : dueDateLabel}</span>
                    <ChevronRight className="w-3 h-3 text-charcoal-400 group-hover:text-charcoal transition-colors" />
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
