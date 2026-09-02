import React, { useState } from 'react';
import { Calendar, Heart, Check, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { HERO_TASKS, WEDDING_DATA, formatRupiah, Task } from '../../data/mockData';

export const HeroDashboardPreview: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(HERO_TASKS);

  const handleToggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Soft warm ambient backdrop glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-tr from-burgundy-200/25 via-beige-200/20 to-gold-200/15 rounded-3xl blur-xl -z-10 opacity-70 pointer-events-none" />

      {/* Main Workspace Frame */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
        
        {/* Workspace Top Window Bar */}
        <div className="bg-ivory-100/90 border-b border-beige px-3.5 sm:px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-burgundy-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-gold-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-beige-300" />
            </div>
            <span className="h-3 w-px bg-beige-300" />
            <span className="text-xs font-semibold text-charcoal truncate">WedFlow Workspace</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-charcoal-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Adit & Nisa</span>
          </div>
        </div>

        {/* Dashboard Content Container */}
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 bg-ivory-50/40">
          
          {/* Header Strip: Couple + Countdown (Mobile-First Wrap) */}
          <div className="flex flex-col xs:flex-row xs:items-center justify-between pb-3 sm:pb-3.5 border-b border-beige gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0 shadow-2xs">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-burgundy text-burgundy" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal leading-tight">
                    {WEDDING_DATA.coupleName}
                  </h3>
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-gold-50 text-gold-600 font-medium border border-gold-200/70 hidden xs:inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Plan Aktif</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-charcoal-400 mt-0.5">
                  <Calendar className="w-3 h-3 text-burgundy shrink-0" />
                  <span className="truncate">{WEDDING_DATA.formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="self-start xs:self-auto bg-white px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl border border-beige shadow-2xs">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-charcoal-400 tracking-wider block">
                Hitung Mundur
              </span>
              <span className="font-serif text-sm sm:text-base font-bold text-burgundy leading-tight block">
                {WEDDING_DATA.daysRemaining} <span className="text-[11px] font-sans font-normal text-charcoal-500">hari lagi</span>
              </span>
            </div>
          </div>

          {/* 3 Summary Metrics: Fluid Grid on Mobile & Desktop */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-beige shadow-2xs">
            {/* Budget */}
            <div className="p-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-medium text-charcoal-400 block mb-0.5 truncate">Budget</span>
              <div className="font-serif text-xs sm:text-base font-bold text-charcoal truncate">
                {formatRupiah(WEDDING_DATA.usedBudget)}
              </div>
              <div className="w-full bg-ivory-200 h-1 sm:h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-burgundy h-full rounded-full" style={{ width: '72%' }} />
              </div>
              <span className="text-[9px] sm:text-[11px] text-charcoal-400 block mt-1 truncate">72% dari 100M</span>
            </div>

            {/* Progress */}
            <div className="p-1 border-x border-beige-200 px-1.5 sm:px-3 min-w-0">
              <span className="text-[10px] sm:text-xs font-medium text-charcoal-400 block mb-0.5 truncate">Progress</span>
              <div className="font-serif text-xs sm:text-base font-bold text-charcoal flex items-baseline gap-1">
                <span>{WEDDING_DATA.progressPercent}%</span>
                <span className="text-[9px] font-sans text-emerald-700 font-medium hidden sm:inline">On Track</span>
              </div>
              <div className="w-full bg-ivory-200 h-1 sm:h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-gold-500 h-full rounded-full" style={{ width: '68%' }} />
              </div>
              <span className="text-[9px] sm:text-[11px] text-charcoal-400 block mt-1 truncate">34/50 tugas</span>
            </div>

            {/* Upcoming */}
            <div className="p-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-medium text-charcoal-400 block mb-0.5 truncate">Upcoming</span>
              <div className="font-serif text-xs sm:text-base font-bold text-charcoal truncate">
                {WEDDING_DATA.upcomingTasksCount} tugas
              </div>
              <div className="mt-1.5 pt-1 border-t border-beige-100 flex items-center justify-between text-[9px] sm:text-[11px] gap-1">
                <span className="text-burgundy font-medium truncate">1 Prioritas</span>
                <span className="text-charcoal-400 hidden xs:inline truncate">4 Pekan ini</span>
              </div>
            </div>
          </div>

          {/* Section: "Apa yang perlu kamu lakukan?" */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-beige shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-0.5">
              <div>
                <h4 className="font-serif text-xs sm:text-sm font-semibold text-charcoal">
                  Apa yang perlu kamu lakukan?
                </h4>
                <p className="text-[11px] text-charcoal-400 hidden xs:block">
                  Tugas terdekat diurutkan berdasarkan prioritas.
                </p>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-burgundy bg-burgundy-50 px-2 py-0.5 rounded-md border border-burgundy-100 shrink-0">
                3 Aksi Utama
              </span>
            </div>

            {/* Clear, Readable Checkable Tasks with Touch Areas (min-h-touch) */}
            <div className="space-y-1.5">
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer min-h-touch ${
                    task.isCompleted
                      ? 'bg-ivory-50/60 border-beige-200 opacity-60'
                      : task.isUrgent
                      ? 'bg-white border-burgundy-200/90 shadow-2xs hover:border-burgundy-300'
                      : 'bg-white border-beige hover:border-beige-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <button
                      type="button"
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                        task.isCompleted
                          ? 'bg-burgundy border border-burgundy text-white'
                          : 'border border-charcoal-300 hover:border-burgundy bg-white'
                      }`}
                      aria-label={`Tandai ${task.title}`}
                    >
                      {task.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span
                      className={`text-xs sm:text-sm leading-snug break-words ${
                        task.isCompleted ? 'line-through text-charcoal-300' : 'text-charcoal font-medium'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        task.isCompleted
                          ? 'bg-emerald-50 text-emerald-700'
                          : task.isUrgent
                          ? 'bg-burgundy-50 text-burgundy font-semibold'
                          : 'bg-ivory-200 text-charcoal-400'
                      }`}
                    >
                      {task.isUrgent && !task.isCompleted ? (
                        <AlertCircle className="w-2.5 h-2.5 text-burgundy shrink-0" />
                      ) : (
                        <Clock className="w-2.5 h-2.5 text-charcoal-300 shrink-0" />
                      )}
                      <span>{task.isCompleted ? 'Selesai' : task.dueInDays}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
