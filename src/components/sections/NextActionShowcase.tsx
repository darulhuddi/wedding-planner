import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { MINGGU_INI_TASKS, Task } from '../../data/mockData';

export const NextActionShowcase: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(MINGGU_INI_TASKS);

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  return (
    <section className="py-14 sm:py-20 lg:py-22 bg-ivory-100/30 border-t border-beige">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Side: Next Action UI Showcase (lg: 7 cols) */}
          <div className="lg:col-span-7 order-2 lg:order-1 w-full">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-beige-300 shadow-card space-y-3.5 sm:space-y-4">
              
              {/* Highlighted "Next Best Action" Recommendation Card */}
              <div className="bg-burgundy-50 border-2 border-burgundy-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-burgundy text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                      ★
                    </span>
                    <span className="text-xs uppercase font-bold tracking-wider text-burgundy truncate">
                      Next Best Action
                    </span>
                  </div>
                  <Badge variant="burgundy" size="sm">Prioritas Minggu Ini</Badge>
                </div>

                <h4 className="font-serif text-lg sm:text-2xl font-bold text-charcoal mt-1 break-words">
                  Bayar DP Catering (50%)
                </h4>
                <p className="text-xs sm:text-sm text-charcoal-400 mt-1 leading-relaxed">
                  Transfer DP Rp12.500.000 ke Puspa Catering untuk mengunci menu pilihan.
                </p>

                <div className="mt-3 sm:mt-3.5 pt-2.5 border-t border-burgundy-100 flex items-center justify-between text-xs">
                  <span className="text-charcoal-500 font-medium">PIC: Adit</span>
                  <span className="text-burgundy font-semibold cursor-pointer hover:underline min-h-touch flex items-center">
                    Tandai Selesai →
                  </span>
                </div>
              </div>

              {/* "Minggu Ini" Task List Container */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-burgundy shrink-0" />
                    <h4 className="font-serif text-base sm:text-lg font-semibold text-charcoal">
                      Minggu Ini
                    </h4>
                  </div>
                  <span className="text-xs text-charcoal-400 font-medium">
                    {tasks.filter(t => !t.isCompleted).length} tugas tersisa
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer min-h-touch ${
                        task.isCompleted
                          ? 'bg-ivory-50/70 border-beige-200 opacity-60'
                          : task.isUrgent
                          ? 'bg-white border-burgundy-200 shadow-soft hover:border-burgundy-300'
                          : 'bg-white border-beige hover:border-beige-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
                        <button
                          type="button"
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                            task.isCompleted
                              ? 'bg-burgundy border border-burgundy text-white'
                              : 'border border-charcoal-300 hover:border-burgundy bg-white'
                          }`}
                          aria-label={`Tandai ${task.title}`}
                        >
                          {task.isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs sm:text-sm font-medium leading-snug break-words block ${task.isCompleted ? 'line-through text-charcoal-300' : 'text-charcoal'}`}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-charcoal-400 mt-0.5 flex-wrap">
                            <span>{task.category}</span>
                            <span>•</span>
                            <span>PIC: {task.assignedTo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`text-[11px] sm:text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          task.isCompleted
                            ? 'bg-emerald-50 text-emerald-700'
                            : task.isUrgent
                            ? 'bg-burgundy-50 text-burgundy font-semibold'
                            : 'bg-ivory-200 text-charcoal-400'
                        }`}>
                          {task.isCompleted ? 'Selesai' : task.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Copy & Conceptual Value (lg: 5 cols) */}
          <div className="lg:col-span-5 order-1 lg:order-2 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2">
              <span className="h-px w-5 bg-gold"></span>
              <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
                NEXT BEST ACTION
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal leading-[1.15] tracking-tight">
              Selalu tahu apa yang harus <br />
              <span className="text-burgundy italic">dilakukan selanjutnya.</span>
            </h2>

            <p className="text-sm sm:text-base text-charcoal-400 leading-relaxed font-normal">
              WedFlow membantu mengubah persiapan yang panjang menjadi langkah-langkah yang jelas.
            </p>

            <blockquote className="p-4 rounded-xl bg-white border border-beige-300 text-charcoal-500 text-sm italic leading-relaxed shadow-soft">
              “Saya tidak perlu memikirkan semuanya sekaligus. Saya cukup tahu apa yang perlu saya kerjakan berikutnya.”
            </blockquote>

            <div className="space-y-3 pt-1 text-sm text-charcoal-400">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-burgundy shrink-0" />
                <span>Urutan tugas adaptif berdasarkan tanggal hari-H</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-burgundy shrink-0" />
                <span>Pembagian peran praktis bersama pasangan</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-burgundy shrink-0" />
                <span>Fokus pada aksi mingguan tanpa rasa kewalahan</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
