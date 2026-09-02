import React, { useState, useCallback, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { TaskRow } from '../checklist/TaskRow';
import { TaskDetailDrawer } from '../checklist/TaskDetailDrawer';
import { AddTaskModal } from '../checklist/AddTaskModal';
import { TaskItem } from '../../types/checklist';
import { WorkspaceViewModel } from '../../types/workspace';
import {
  getTimelineGroups,
  getTimelineSummary,
  TimelineGroup,
} from '../../domain/timelineSelectors';
import {
  toggleTaskComplete,
  updateTask,
  addTask,
  deleteTask,
} from '../../utils/checklistUtils';

interface TimelinePageProps {
  workspace: WorkspaceViewModel;
  tasks: TaskItem[];
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  workspace,
  tasks,
  onTaskChange,
  currentModule,
  onNavigateModule,
}) => {
  // Modal & Drawer State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Derived timeline view model & summary
  const timelineGroups = useMemo(
    () => getTimelineGroups(tasks, workspace.weddingDate),
    [tasks, workspace.weddingDate]
  );

  const summary = useMemo(
    () => getTimelineSummary(tasks, workspace.weddingDate),
    [tasks, workspace.weddingDate]
  );

  // Separate non-deadline group from scheduled timeline groups
  const scheduledGroups = useMemo(
    () => timelineGroups.filter((g) => g.key !== 'no_deadline'),
    [timelineGroups]
  );

  const noDeadlineGroup = useMemo(
    () => timelineGroups.find((g) => g.key === 'no_deadline'),
    [timelineGroups]
  );

  // Task Mutations
  const handleToggleComplete = useCallback(
    (id: string) => {
      const updated = toggleTaskComplete(tasks, id);
      onTaskChange(updated);
      if (selectedTask && selectedTask.id === id) {
        setSelectedTask(updated.find((t) => t.id === id) || null);
      }
    },
    [tasks, onTaskChange, selectedTask]
  );

  const handleAddTask = useCallback(
    (newTask: TaskItem) => {
      onTaskChange(addTask(tasks, newTask));
    },
    [tasks, onTaskChange]
  );

  const handleUpdateTask = useCallback(
    (updatedTask: TaskItem) => {
      onTaskChange(updateTask(tasks, updatedTask));
      setSelectedTask(updatedTask);
    },
    [tasks, onTaskChange]
  );

  const handleDeleteTask = useCallback(
    (id: string) => {
      onTaskChange(deleteTask(tasks, id));
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
    },
    [tasks, onTaskChange, selectedTask]
  );

  const allCompleted = summary.totalTasks > 0 && summary.activeTasks === 0;

  return (
    <div
      className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row
      selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8"
    >
      {/* Desktop Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Navigation */}
        <header
          className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md
          border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs"
        >
          <button
            type="button"
            onClick={() => onNavigateModule('dashboard')}
            className="flex items-center gap-2 text-charcoal-400 hover:text-charcoal
              transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-burgundy" />
            <span className="font-serif text-base font-bold text-charcoal">Timeline</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Page Body */}
        <main
          className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12
          max-w-[1000px] mx-auto w-full space-y-6 sm:space-y-8"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600">
                Alur Waktu Persiapan
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-0.5">
                Timeline Pernikahan
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-400 mt-1">
                Rencanakan langkahmu menuju Hari-H secara terstruktur.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold
                rounded-xl bg-burgundy text-white hover:bg-burgundy-700
                transition-all shadow-xs cursor-pointer min-h-touch shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tugas</span>
            </button>
          </div>

          {/* Wedding Date Context Banner */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gold-600 tracking-wider">
                    Hari-H Pernikahan
                  </span>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                    {summary.weddingDateFormatted || 'Belum Ditentukan'}
                  </h2>
                </div>
              </div>

              {summary.daysUntilWedding > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-50 border border-gold-200/80 text-gold-700 rounded-full text-xs font-bold self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{summary.daysUntilWedding} hari lagi</span>
                </div>
              ) : summary.daysUntilWedding === 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-burgundy-50 border border-burgundy-200 text-burgundy rounded-full text-xs font-bold self-start sm:self-auto">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hari Ini! 🎉</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ivory-100 border border-beige text-charcoal-400 rounded-full text-xs font-medium self-start sm:self-auto">
                  <span>Tanggal berlalu</span>
                </div>
              )}
            </div>

            {/* Compact Metric Chips */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-beige">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-ivory-100 text-charcoal-500 px-3 py-1 rounded-full border border-beige">
                <Clock className="w-3.5 h-3.5 text-burgundy" />
                {summary.activeTasks} tugas aktif
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-ivory-100 text-charcoal-500 px-3 py-1 rounded-full border border-beige">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {summary.completedTasks} selesai
              </span>
              {summary.overdueTasks > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-200/80">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  {summary.overdueTasks} terlambat
                </span>
              )}
              {summary.thisWeekTasks > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gold-50 text-gold-700 px-3 py-1 rounded-full border border-gold-200">
                  <Calendar className="w-3.5 h-3.5 text-gold-600" />
                  {summary.thisWeekTasks} minggu ini
                </span>
              )}
            </div>
          </div>

          {/* ALL COMPLETED CELEBRATION STATE */}
          {allCompleted && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-emerald-900">
                Semua persiapanmu sudah selesai 🎉
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 max-w-md mx-auto">
                Semua tugas pada timeline telah berhasil diselesaikan dengan baik.
              </p>
            </div>
          )}

          {/* EMPTY TIMELINE STATE (No tasks at all) */}
          {summary.totalTasks === 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-beige-300 shadow-card text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto">
                <CalendarRange className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                  Belum ada tugas di timeline.
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-400 max-w-md mx-auto">
                  Tambahkan tugas untuk mulai menyusun langkah menuju Hari-H.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl
                    bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Tugas</span>
                </button>
              </div>
            </div>
          )}

          {/* NO SCHEDULED TASKS STATE (Only no-deadline tasks exist) */}
          {summary.totalTasks > 0 && scheduledGroups.length === 0 && (
            <div className="bg-white rounded-2xl p-5 border border-beige-300 text-center space-y-2">
              <p className="text-sm font-semibold text-charcoal">
                Belum ada jadwal yang ditentukan.
              </p>
              <p className="text-xs text-charcoal-400">
                Semua tugas yang ada saat ini belum memiliki deadline. Tentukan tenggat waktu di bawah.
              </p>
            </div>
          )}

          {/* VERTICAL TIMELINE CONTAINER */}
          {scheduledGroups.length > 0 && (
            <div className="relative pl-4 sm:pl-6 space-y-8">
              {/* Vertical Spine Line */}
              <div className="absolute left-[15px] sm:left-[23px] top-4 bottom-4 w-0.5 bg-beige-300 z-0" />

              {scheduledGroups.map((group) => (
                <TimelineGroupSection
                  key={group.key}
                  group={group}
                  onToggle={handleToggleComplete}
                  onSelectTask={(task) => setSelectedTask(task)}
                />
              ))}
            </div>
          )}

          {/* DEDICATED NO DEADLINE SECTION */}
          {noDeadlineGroup && noDeadlineGroup.tasks.length > 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige-300 shadow-card space-y-4 mt-8">
              <div className="flex items-center justify-between gap-3 border-b border-beige pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-ivory-200 border border-beige flex items-center justify-center text-charcoal-400 shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
                      Belum Ada Deadline
                    </h3>
                    <p className="text-xs text-charcoal-400">
                      Tentukan tanggal tenggat waktu agar persiapanmu lebih teratur.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ivory-200 text-charcoal-400 border border-beige shrink-0">
                  {noDeadlineGroup.tasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {noDeadlineGroup.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggleComplete}
                    onSelectTask={(task) => setSelectedTask(task)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentModule={currentModule} onNavigate={onNavigateModule} />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onToggleComplete={handleToggleComplete}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Add Custom Task Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTask={handleAddTask}
        initialCategory="general"
      />
    </div>
  );
};

// ─── Timeline Group Section Component ───────────────────────────────────────

interface TimelineGroupSectionProps {
  group: TimelineGroup;
  onToggle: (id: string) => void;
  onSelectTask: (task: TaskItem) => void;
}

const TimelineGroupSection: React.FC<TimelineGroupSectionProps> = ({
  group,
  onToggle,
  onSelectTask,
}) => {
  return (
    <div className="relative z-10 space-y-3">
      {/* Milestone / Node Header */}
      <div className="flex items-center gap-3 -ml-4 sm:-ml-6">
        {/* Node Dot / Milestone Icon */}
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow-2xs z-10 ${
            group.isWeddingDay
              ? 'bg-gold-500 border-gold-300 text-white shadow-md ring-4 ring-gold-100'
              : group.isOverdue
              ? 'bg-rose-500 border-rose-300 text-white'
              : group.key === 'this_week'
              ? 'bg-burgundy border-burgundy-300 text-white'
              : 'bg-white border-beige-300 text-charcoal-400'
          }`}
        >
          {group.isWeddingDay ? (
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : group.isOverdue ? (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : group.key === 'this_week' ? (
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </div>

        {/* Group Header Label */}
        <div className="flex flex-wrap items-baseline gap-2 min-w-0">
          <h3
            className={`font-serif text-base sm:text-lg font-bold tracking-tight ${
              group.isWeddingDay
                ? 'text-gold-700 font-extrabold'
                : group.isOverdue
                ? 'text-rose-600'
                : 'text-charcoal'
            }`}
          >
            {group.label}
          </h3>
          {group.subtitle && (
            <span className="text-xs text-charcoal-400 font-medium truncate">
              • {group.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Task Row List */}
      <div className="space-y-2 pt-1">
        {group.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={onToggle}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
};
