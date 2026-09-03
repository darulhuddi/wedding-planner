import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  Tag,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Filter,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { TaskRow } from './TaskRow';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { AddTaskModal } from './AddTaskModal';
import { StarterPlanModal } from '../starterplan/StarterPlanModal';
import { TaskItem, ChecklistView, ChecklistFilter, TaskCategoryId } from '../../types/checklist';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { WeddingEvent } from '../../domain/events';
import { getStarterRecommendations } from '../../domain/recommendationEngine';
import { ALL_TASK_CATEGORY_IDS, CATEGORY_LABELS } from '../../domain/categories';
import {
  toggleTaskComplete,
  getChecklistProgress,
  getOverdueTasks,
  groupTasksByTime,
  groupTasksByCategory,
  getActiveTasks,
  getCompletedTasks,
  filterTasksByCategory,
  updateTask,
  addTask,
  deleteTask,
} from '../../utils/checklistUtils';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ChecklistPageProps {
  workspace: WorkspaceViewModel;
  storedWorkspace?: StoredWorkspace;
  tasks: TaskItem[];
  events?: WeddingEvent[];
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  onBulkAddTasks?: (newTasks: TaskItem[]) => Promise<void>;
  currentModule: string;
  onNavigateModule: (module: string, initialFilter?: TaskCategoryId | 'all') => void;
  initialCategoryFilter?: TaskCategoryId | 'all';
}

// ─── Collapsible Group Section ───────────────────────────────────────────────

interface TaskGroupSectionProps {
  label: string;
  tasks: TaskItem[];
  isOverdue?: boolean;
  defaultOpen?: boolean;
  onToggle: (id: string) => void;
  onSelectTask: (task: TaskItem) => void;
}

const TaskGroupSection: React.FC<TaskGroupSectionProps> = ({
  label,
  tasks,
  isOverdue = false,
  defaultOpen = true,
  onToggle,
  onSelectTask,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between py-1.5 group cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
          <span
            className={`text-xs font-bold uppercase tracking-wider
            ${isOverdue ? 'text-rose-500' : 'text-charcoal-400'}`}
          >
            {label}
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
            ${
              isOverdue
                ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                : 'bg-ivory-200 text-charcoal-400 border border-beige'
            }`}
          >
            {tasks.length}
          </span>
        </div>
        <span className="text-charcoal-300 group-hover:text-charcoal-400 transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onSelectTask={onSelectTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Checklist Progress Header ────────────────────────────────────────────────

interface ChecklistProgressHeaderProps {
  total: number;
  completed: number;
  percentage: number;
  overdueCount: number;
}

const ChecklistProgressHeader: React.FC<ChecklistProgressHeaderProps> = ({
  total,
  completed,
  percentage,
  overdueCount,
}) => {
  const isComplete = percentage === 100 && total > 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige-300 shadow-card space-y-4">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600">
            Checklist Persiapan
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-0.5">
            Daftar Tugas
          </h1>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal">
            {percentage}%
          </span>
          <span className="text-xs text-charcoal-400 font-medium">
            ({completed} dari {total} selesai)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-ivory-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-beige">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isComplete ? 'bg-emerald-600' : 'bg-burgundy'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium
          bg-ivory-100 text-charcoal-500 px-3 py-1 rounded-full border border-beige"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {completed} selesai
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium
          bg-ivory-100 text-charcoal-500 px-3 py-1 rounded-full border border-beige"
        >
          <Clock className="w-3.5 h-3.5 text-burgundy" />
          {total - completed} aktif
        </span>
        {overdueCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold
            bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-200/80"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            {overdueCount} terlambat
          </span>
        )}
        {isComplete && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold
            bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Semua tugas selesai 🎉
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Main Checklist Page ──────────────────────────────────────────────────────

export const ChecklistPage: React.FC<ChecklistPageProps> = ({
  workspace,
  storedWorkspace,
  tasks,
  events = [],
  onTaskChange,
  onBulkAddTasks,
  currentModule,
  onNavigateModule,
  initialCategoryFilter = 'all',
}) => {
  const [view, setView] = useState<ChecklistView>('by_time');
  const [statusFilter, setStatusFilter] = useState<ChecklistFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategoryId | 'all'>(initialCategoryFilter);

  // Sync categoryFilter if initialCategoryFilter changes (e.g. navigation from dashboard module cards)
  useEffect(() => {
    setCategoryFilter(initialCategoryFilter);
  }, [initialCategoryFilter]);

  // Modal & Drawer State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStarterPlanOpen, setIsStarterPlanOpen] = useState(false);

  // Recommendations calculated fresh for subtle entry point & empty states
  const recommendations = useMemo(() => {
    return getStarterRecommendations({
      workspace: storedWorkspace || workspace,
      tasks,
      events,
    });
  }, [storedWorkspace, workspace, tasks, events]);

  // Bulk creation handler from Starter Plan Modal
  const handleTasksCreatedFromStarterPlan = useCallback(
    async (newTasks: TaskItem[]) => {
      if (onBulkAddTasks) {
        await onBulkAddTasks(newTasks);
      } else {
        onTaskChange([...tasks, ...newTasks]);
      }
    },
    [onBulkAddTasks, onTaskChange, tasks]
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

  // Derived Progress & Counts
  const progress = useMemo(() => getChecklistProgress(tasks), [tasks]);
  const overdueCount = useMemo(() => getOverdueTasks(tasks).length, [tasks]);

  // Two-step filtering: 1. Status Filter -> 2. Category Filter
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter === 'active') result = getActiveTasks(result);
    else if (statusFilter === 'completed') result = getCompletedTasks(result);

    return filterTasksByCategory(result, categoryFilter);
  }, [tasks, statusFilter, categoryFilter]);

  // Groupings
  const timeGroups = useMemo(() => groupTasksByTime(filteredTasks), [filteredTasks]);
  const categoryGroups = useMemo(() => groupTasksByCategory(filteredTasks), [filteredTasks]);

  const resetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const statusFilterLabels: Record<ChecklistFilter, string> = {
    all: 'Semua Status',
    active: 'Belum Selesai',
    completed: 'Selesai',
  };

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

      {/* Main Content */}
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
            <CheckSquare className="w-4 h-4 text-burgundy" />
            <span className="font-serif text-base font-bold text-charcoal">Checklist</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Page Body */}
        <main
          className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12
          max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-5 sm:space-y-6"
        >
          {/* Progress Header */}
          <ChecklistProgressHeader
            total={progress.total}
            completed={progress.completed}
            percentage={progress.percentage}
            overdueCount={overdueCount}
          />

          {/* Toolbar: View Toggle + Status Filter + Category Filter + Add Task CTA */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: View Toggle (Primary: Time-based, Secondary: Category-based) */}
              <div className="flex items-center bg-white border border-beige rounded-xl p-1 gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setView('by_time')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    rounded-lg transition-all cursor-pointer ${
                      view === 'by_time'
                        ? 'bg-burgundy text-white shadow-xs'
                        : 'text-charcoal-400 hover:text-charcoal'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Berdasarkan Waktu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView('by_category')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    rounded-lg transition-all cursor-pointer ${
                      view === 'by_category'
                        ? 'bg-burgundy text-white shadow-xs'
                        : 'text-charcoal-400 hover:text-charcoal'
                    }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Berdasarkan Kategori</span>
                </button>
              </div>

              {/* Right: Add Custom Task CTA + Subtle Starter Plan CTA */}
              <div className="flex flex-wrap items-center gap-2">
                {recommendations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsStarterPlanOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold
                      rounded-xl bg-ivory-100 text-burgundy border border-burgundy-200/70 hover:bg-burgundy-50
                      transition-all shadow-2xs cursor-pointer min-h-touch"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-burgundy" />
                    <span>✨ Lihat Rekomendasi untukmu</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold
                    rounded-xl bg-burgundy text-white hover:bg-burgundy-700
                    transition-all shadow-xs cursor-pointer min-h-touch"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Tugas</span>
                </button>
              </div>
            </div>

            {/* Filter Bar (Status Filter + Category Filter) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Status Filter Pills */}
              <div className="flex items-center bg-white border border-beige rounded-xl p-1 gap-1">
                {(['active', 'all', 'completed'] as ChecklistFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      statusFilter === f
                        ? 'bg-ivory-200 text-charcoal font-bold'
                        : 'text-charcoal-400 hover:text-charcoal'
                    }`}
                  >
                    {statusFilterLabels[f]}
                  </button>
                ))}
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-beige rounded-xl px-3 py-1 text-xs font-semibold text-charcoal">
                <Filter className="w-3.5 h-3.5 text-burgundy shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as TaskCategoryId | 'all')}
                  className="bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  {ALL_TASK_CATEGORY_IDS.map((catId) => (
                    <option key={catId} value={catId}>
                      {CATEGORY_LABELS[catId]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filter indicator */}
              {(statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-burgundy hover:text-burgundy-700
                    font-medium px-2 py-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Task Grouping List */}
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-card
            overflow-hidden divide-y divide-beige"
          >
            {/* EMPTY STATE 1: Overall zero tasks */}
            {tasks.length === 0 && (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                  Belum ada tugas yang perlu dikerjakan.
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-400 max-w-md mx-auto leading-relaxed">
                  Tambahkan tugas pertama atau gunakan rekomendasi starter plan untuk mulai mengatur alur persiapan pernikahanmu.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  {recommendations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsStarterPlanOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl
                        bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-gold-300" />
                      <span>✨ Lihat Rekomendasi untukmu</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                      recommendations.length > 0
                        ? 'bg-white border border-beige hover:border-beige-300 text-charcoal'
                        : 'bg-burgundy text-white hover:bg-burgundy-700 shadow-xs'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Tugas {recommendations.length > 0 ? 'Manual' : 'Pertama'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* EMPTY STATE 2: Filter results 0 (but overall tasks exist) */}
            {tasks.length > 0 && filteredTasks.length === 0 && (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-ivory-200 flex items-center justify-center text-charcoal-400 mx-auto">
                  <Filter className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
                  Tidak ada tugas yang sesuai dengan filter ini.
                </h3>
                <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
                  Coba ubah pilihan filter status atau kategori untuk melihat tugas lainnya.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl
                      bg-white border border-beige hover:border-beige-300 text-charcoal transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-burgundy" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* TIME-BASED VIEW (DEFAULT) */}
            {view === 'by_time' &&
              timeGroups.map((group) => (
                <div key={group.key} className="p-4 sm:p-5 space-y-2">
                  <TaskGroupSection
                    label={group.label}
                    tasks={group.tasks}
                    isOverdue={group.key === 'overdue'}
                    defaultOpen={true}
                    onToggle={handleToggleComplete}
                    onSelectTask={(task) => setSelectedTask(task)}
                  />
                </div>
              ))}

            {/* CATEGORY-BASED VIEW */}
            {view === 'by_category' &&
              categoryGroups.map((group) => (
                <div key={group.category} className="p-4 sm:p-5 space-y-2">
                  <TaskGroupSection
                    label={group.label}
                    tasks={group.tasks}
                    defaultOpen={true}
                    onToggle={handleToggleComplete}
                    onSelectTask={(task) => setSelectedTask(task)}
                  />
                </div>
              ))}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentModule={currentModule} onNavigate={onNavigateModule} />

      {/* Task Detail Drawer / Bottom Sheet */}
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
        initialCategory={categoryFilter !== 'all' ? categoryFilter : 'general'}
      />

      {/* Starter Plan Modal */}
      <StarterPlanModal
        isOpen={isStarterPlanOpen}
        workspace={storedWorkspace || workspace}
        tasks={tasks}
        events={events}
        onClose={() => setIsStarterPlanOpen(false)}
        onTasksCreated={handleTasksCreatedFromStarterPlan}
      />
    </div>
  );
};
