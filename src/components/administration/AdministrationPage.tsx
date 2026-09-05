import React, { useState, useMemo } from 'react';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { TaskItem, TaskStatus } from '../../types/checklist';
import { WeddingEvent } from '../../domain/events';
import { StoredAdministrationContext, AdministrativeStage } from '../../domain/administration/types';
import { ADMINISTRATIVE_TEMPLATES } from '../../domain/administration/templates';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import {
  generateAdministrativeTasks,
  getAdministrativeNextBestAction,
  calculateAdministrativeRisk,
  calculateBusinessDaysBefore,
  calculateDaysBefore,
  calculateRemainingWorkingDays,
  assessPnbpStatus,
} from '../../domain/administration/engine';
import { AdministrationSetupModal } from './AdministrationSetupModal';
import { AdministrationTaskDrawer } from './AdministrationTaskDrawer';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import {
  FileText,
  Calendar,
  Target,
  Coins,
  ShieldAlert,
  Info,
  ChevronRight,
  Settings,
  ArrowRight,
} from 'lucide-react';

export interface AdministrationPageProps {
  workspace: WorkspaceViewModel;
  tasks: TaskItem[];
  events: WeddingEvent[];
  onWorkspaceChange: (updated: StoredWorkspace) => void;
  onUpdateTask: (task: TaskItem) => void;
  onAddTask: (task: TaskItem) => void;
  onBulkAddTasks?: (tasks: TaskItem[]) => Promise<void>;
  currentModule?: string;
  onNavigateModule?: (module: string) => void;
}

export const AdministrationPage: React.FC<AdministrationPageProps> = ({
  workspace,
  tasks,
  events,
  onWorkspaceChange,
  onUpdateTask,
  onAddTask,
  onBulkAddTasks,
  currentModule = 'administration',
  onNavigateModule,
}) => {
  const [activeStage, setActiveStage] = useState<AdministrativeStage | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'uncompleted' | 'national_only' | 'confirm_kua'>('all');
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const ceremonyEvent = useMemo(
    () => events.find((e) => e.type === 'ceremony'),
    [events]
  );

  // Administrative tasks in canonical task store
  const administrativeTasks = useMemo(
    () => tasks.filter((t) => t.category === 'prosesi_administrasi'),
    [tasks]
  );

  // Derived calculations
  const pnbpInfo = useMemo(() => assessPnbpStatus(ceremonyEvent), [ceremonyEvent]);
  const legalDeadline = useMemo(
    () => calculateBusinessDaysBefore(workspace.weddingDate, 10),
    [workspace.weddingDate]
  );
  const planningTarget = useMemo(
    () => calculateDaysBefore(workspace.weddingDate, 35),
    [workspace.weddingDate]
  );
  const remainingWorkingDays = useMemo(
    () => calculateRemainingWorkingDays(today, workspace.weddingDate),
    [today, workspace.weddingDate]
  );

  // Check if planning target has passed
  const isPlanningTargetPassed = useMemo(() => {
    if (!planningTarget) return false;
    return planningTarget < today;
  }, [planningTarget, today]);

  const riskAssessment = useMemo(
    () =>
      calculateAdministrativeRisk(
        administrativeTasks,
        workspace.administrationContext,
        workspace.weddingDate,
        today
      ),
    [administrativeTasks, workspace.administrationContext, workspace.weddingDate, today]
  );

  const currentNba = useMemo(
    () =>
      getAdministrativeNextBestAction(
        administrativeTasks,
        workspace.administrationContext,
        workspace.weddingDate,
        today
      ),
    [administrativeTasks, workspace.administrationContext, workspace.weddingDate, today]
  );

  // Completion metrics
  const totalCount = administrativeTasks.length;
  const completedCount = administrativeTasks.filter((t) => t.status === 'completed').length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Stage tasks counter
  const stageCounts = useMemo(() => {
    const counts: Record<AdministrativeStage, number> = {
      documents: 0,
      jurisdiction: 0,
      registration: 0,
      examination: 0,
    };
    administrativeTasks.forEach((t) => {
      const tpl = t.templateId ? ADMINISTRATIVE_TEMPLATES[t.templateId] : null;
      if (tpl && tpl.stage) {
        counts[tpl.stage] = (counts[tpl.stage] || 0) + 1;
      }
    });
    return counts;
  }, [administrativeTasks]);

  // Handle Initializing / Updating tasks based on setup context
  const handleSaveContext = (newContext: StoredAdministrationContext) => {
    const updatedStoredWorkspace: StoredWorkspace = {
      id: workspace.id,
      userId: workspace.userId,
      coupleName: workspace.coupleName,
      weddingDate: workspace.weddingDate,
      estimatedBudget: workspace.estimatedBudget,
      estimatedGuestCount: workspace.estimatedGuestCount,
      completedCategories: workspace.completedCategories,
      primaryPlanningPriority: workspace.primaryPlanningPriority,
      religiousContexts: workspace.religiousContexts,
      culturalContext: workspace.culturalContext,
      administrationContext: newContext,
      createdAt: workspace.createdAt,
      updatedAt: new Date().toISOString(),
    };

    onWorkspaceChange(updatedStoredWorkspace);

    // Generate/sync tasks
    const generated = generateAdministrativeTasks(
      newContext,
      workspace.weddingDate,
      ceremonyEvent,
      administrativeTasks
    );

    // Save newly generated tasks
    const newTasks = generated.filter(
      (task) => !tasks.some((t) => t.id === task.id || (t.templateId && t.templateId === task.templateId))
    );
    if (newTasks.length > 0) {
      if (onBulkAddTasks) {
        onBulkAddTasks(newTasks);
      } else {
        newTasks.forEach((t) => onAddTask(t));
      }
    }
  };

  // Quick initial task bootstrap if empty
  const handleQuickBootstrap = () => {
    const generated = generateAdministrativeTasks(
      workspace.administrationContext,
      workspace.weddingDate,
      ceremonyEvent,
      administrativeTasks
    );
    const newTasks = generated.filter(
      (task) => !tasks.some((t) => t.id === task.id || (t.templateId && t.templateId === task.templateId))
    );
    if (newTasks.length > 0) {
      if (onBulkAddTasks) {
        onBulkAddTasks(newTasks);
      } else {
        newTasks.forEach((t) => onAddTask(t));
      }
    }
  };

  // Filter tasks for display
  const filteredTasks = useMemo(() => {
    return administrativeTasks.filter((task) => {
      const tpl = task.templateId ? ADMINISTRATIVE_TEMPLATES[task.templateId] : null;

      // Stage Filter
      if (activeStage !== 'all' && tpl && tpl.stage !== activeStage) {
        return false;
      }

      // Requirement / Completion Filter
      if (filterType === 'uncompleted' && task.status === 'completed') {
        return false;
      }
      if (filterType === 'national_only' && tpl?.metadata.requirementLevel !== 'NATIONAL_REQUIREMENT') {
        return false;
      }
      if (filterType === 'confirm_kua' && tpl?.metadata.requirementLevel !== 'CONFIRM_WITH_KUA') {
        return false;
      }

      return true;
    });
  }, [administrativeTasks, activeStage, filterType]);

  const handleStatusToggle = (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      onUpdateTask({
        ...target,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      });
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop App Sidebar */}
      <DesktopSidebar
        currentModule={currentModule || 'administration'}
        onNavigate={onNavigateModule || (() => {})}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate}
        workspaceId={workspace.id}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar */}
        <MobileModuleHeader
          onBack={() => (onNavigateModule ? onNavigateModule('dashboard') : undefined)}
          title="Administrasi"
          icon={<FileText className="w-4 h-4 text-burgundy" />}
        />

        {/* Main Content Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-8">
          {/* ── 1. HERO SECTION (WARM EDITORIAL REFERENCE) ────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl border border-[#EFE4DA] bg-gradient-to-r from-[#FBF4EC] via-[#F8ECE3] to-[#F1DDD1] p-6 sm:p-8 lg:p-10 shadow-soft">
          {/* Subtle floral/ring decorative watermark */}
          <div className="absolute -right-6 -bottom-8 w-64 h-64 opacity-20 pointer-events-none select-none">
            <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-burgundy">
              <circle cx="90" cy="110" r="45" stroke="currentColor" strokeWidth="3" />
              <circle cx="130" cy="110" r="45" stroke="#B89A70" strokeWidth="3" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-burgundy text-white shadow-2xs">
                  KUA & SIMKAH Kemenag RI
                </span>
                <span className="text-xs font-medium text-charcoal-500">
                  PMA No. 30 Tahun 2024
                </span>
              </div>

              {/* Heading */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-charcoal tracking-tight leading-tight">
                Administrasi Pernikahan
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed max-w-xl">
                Panduan persiapan dokumen resmi pencatatan nikah, verifikasi wali, deadline pendaftaran KUA, dan biaya PNBP. WedSiap membantumu tahu posisi persiapan dan langkah berikutnya.
              </p>
            </div>

            {/* Right Side: Romantic Tagline & Setup Action */}
            <div className="flex flex-col items-start lg:items-end justify-between gap-4 shrink-0">
              <div className="hidden sm:block text-right">
                <p className="font-serif italic text-lg sm:text-xl text-burgundy-900/80 tracking-wide select-none">
                  Langkah kecil menuju hari besar
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSetupOpen(true)}
                  className="px-5 py-2.5 bg-burgundy hover:bg-burgundy-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Setup Profil KUA</span>
                </button>

                {administrativeTasks.length === 0 && (
                  <button
                    onClick={handleQuickBootstrap}
                    className="px-5 py-2.5 bg-white hover:bg-ivory-100 text-burgundy text-xs sm:text-sm font-semibold rounded-xl border border-beige shadow-sm transition-all cursor-pointer"
                  >
                    Buat Panduan Berkas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. KPI METRICS (4 CARDS GRID) ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Kesiapan Berkas */}
          <div className="bg-white p-5 rounded-2xl border border-beige-200 shadow-soft flex flex-col justify-between hover:border-beige-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-burgundy" />
                  <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                    Kesiapan Berkas
                  </span>
                </div>
                <span className="text-sm font-bold text-burgundy">{completionPercentage}%</span>
              </div>
              <div className="text-2xl font-sans font-bold text-charcoal">
                {completedCount}{' '}
                <span className="text-xs font-sans font-normal text-charcoal-400">
                  / {totalCount} Selesai
                </span>
              </div>
            </div>
            <div className="w-full bg-[#F3EFEA] h-1.5 rounded-full overflow-hidden mt-4">
              <div
                className="bg-burgundy h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Card 2: Batas Resmi KUA */}
          <div className="bg-white p-5 rounded-2xl border border-beige-200 shadow-soft flex flex-col justify-between hover:border-beige-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-charcoal-500" />
                  <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                    Batas Resmi KUA
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  10 Hari Kerja
                </span>
              </div>
              <div className="text-lg sm:text-xl font-serif font-bold text-charcoal mt-1">
                {legalDeadline ? formatIndonesianDate(legalDeadline) : 'Belum Ditentukan'}
              </div>
            </div>
            <p className="text-xs text-charcoal-400 mt-2">
              Sisa <strong className="text-charcoal-700 font-semibold">{remainingWorkingDays} hari kerja</strong> lagi
            </p>
          </div>

          {/* Card 3: Target Rekomendasi */}
          <div className="bg-white p-5 rounded-2xl border border-beige-200 shadow-soft flex flex-col justify-between hover:border-beige-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-charcoal-500" />
                  <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                    Target Rekomendasi
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                  WedSiap Target
                </span>
              </div>
              <div className="text-lg sm:text-xl font-serif font-bold text-charcoal mt-1">
                {planningTarget ? formatIndonesianDate(planningTarget) : 'Belum Ditentukan'}
              </div>
            </div>
            <div className="mt-2">
              {isPlanningTargetPassed ? (
                <>
                  <span className="text-xs font-semibold text-rose-600">Target sudah terlewati</span>
                  <p className="text-[11px] text-charcoal-400 mt-0.5 leading-tight">
                    Sebaiknya mulai proses pendaftaran sekarang agar masih ada waktu.
                  </p>
                </>
              ) : (
                <p className="text-xs text-charcoal-400">
                  Daftar lebih awal untuk kunci kuota penghulu
                </p>
              )}
            </div>
          </div>

          {/* Card 4: Estimasi Biaya PNBP */}
          <div className="bg-white p-5 rounded-2xl border border-beige-200 shadow-soft flex flex-col justify-between hover:border-beige-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-charcoal-500" />
                  <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                    Estimasi Biaya PNBP
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-ivory-200 text-charcoal-500 border border-beige">
                    Resmi Negara
                  </span>
                  <Info className="w-3.5 h-3.5 text-charcoal-400" />
                </div>
              </div>
              <div className="text-2xl font-sans font-bold text-charcoal mt-1">
                {pnbpInfo.amount === 0 ? 'Rp0' : 'Rp600.000'}
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-charcoal-500">
                {pnbpInfo.amount === 0 ? 'Balai Nikah KUA pada hari kerja' : 'Akad di luar kantor KUA / akhir pekan'}
              </p>
              <div className="bg-ivory-50 p-2 rounded-lg text-[10px] text-charcoal-400 leading-tight border border-beige/60">
                Dapat terdapat pengecualian tertentu. Konfirmasi ke KUA setempat.
              </div>
            </div>
          </div>

        </div>

        {/* ── 3. RISK ASSESSMENT BANNER ─────────────────────────────────────── */}
        <div className="bg-[#FAF5F5] border border-[#F3E3E3] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100/60 border border-rose-200 flex items-center justify-center text-burgundy shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal">
                Status Risiko Administrasi: {riskAssessment.label}
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                {riskAssessment.reasons.join(' ')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (currentNba && currentNba.taskId) {
                const found = tasks.find((t) => t.id === currentNba.taskId);
                if (found) setSelectedTask(found);
              }
            }}
            className="text-xs font-semibold text-charcoal hover:text-burgundy bg-white border border-[#E9DFDF] hover:bg-[#F8EFEF] px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Lihat Detail Risiko</span>
            <ChevronRight className="w-3.5 h-3.5 text-charcoal-400" />
          </button>
        </div>

        {/* ── 4. NEXT BEST ACTION (FOCAL ACTION CARD) ───────────────────────── */}
        {currentNba && (
          <div className="bg-white p-6 rounded-2xl border border-beige-200 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-burgundy text-white flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-burgundy uppercase tracking-wider block">
                  Langkah Berikutnya
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal leading-tight">
                  {currentNba.title}
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-500 max-w-2xl leading-relaxed">
                  {currentNba.reason || currentNba.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (!workspace.administrationContext?.isSetupCompleted) {
                  setIsSetupOpen(true);
                } else if (currentNba.taskId) {
                  const found = tasks.find((t) => t.id === currentNba.taskId);
                  if (found) setSelectedTask(found);
                }
              }}
              className="px-6 py-3 bg-burgundy hover:bg-burgundy-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>{!workspace.administrationContext?.isSetupCompleted ? 'Lengkapi Sekarang' : 'Lihat Petunjuk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── 5. JOURNEY STEPPER FLOW ───────────────────────────────────────── */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige-200 shadow-soft overflow-x-auto">
          <div className="flex items-center justify-between min-w-[640px] gap-2">
            
            {/* Step 1 */}
            <button
              onClick={() => setActiveStage(activeStage === 'documents' ? 'all' : 'documents')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  activeStage === 'documents'
                    ? 'bg-burgundy text-white shadow-2xs'
                    : 'bg-ivory-200 text-charcoal-500 border border-beige group-hover:border-burgundy'
                }`}
              >
                1
              </div>
              <div>
                <span className="text-xs font-bold text-charcoal block leading-tight">
                  Dokumen Pribadi
                </span>
                <span className="text-[11px] text-charcoal-400 block">
                  {stageCounts.documents} tugas
                </span>
              </div>
            </button>

            <div className="w-12 h-px bg-beige-200 shrink-0" />

            {/* Step 2 */}
            <button
              onClick={() => setActiveStage(activeStage === 'jurisdiction' ? 'all' : 'jurisdiction')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  activeStage === 'jurisdiction'
                    ? 'bg-burgundy text-white shadow-2xs'
                    : 'bg-ivory-200 text-charcoal-500 border border-beige group-hover:border-burgundy'
                }`}
              >
                2
              </div>
              <div>
                <span className="text-xs font-bold text-charcoal block leading-tight">
                  Kelurahan & KUA Asal
                </span>
                <span className="text-[11px] text-charcoal-400 block">
                  {stageCounts.jurisdiction} tugas
                </span>
              </div>
            </button>

            <div className="w-12 h-px bg-beige-200 shrink-0" />

            {/* Step 3 */}
            <button
              onClick={() => setActiveStage(activeStage === 'registration' ? 'all' : 'registration')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  activeStage === 'registration'
                    ? 'bg-burgundy text-white shadow-2xs'
                    : 'bg-ivory-200 text-charcoal-500 border border-beige group-hover:border-burgundy'
                }`}
              >
                3
              </div>
              <div>
                <span className="text-xs font-bold text-charcoal block leading-tight">
                  Daftar & Bayar PNBP
                </span>
                <span className="text-[11px] text-charcoal-400 block">
                  {stageCounts.registration} tugas
                </span>
              </div>
            </button>

            <div className="w-12 h-px bg-beige-200 shrink-0" />

            {/* Step 4 */}
            <button
              onClick={() => setActiveStage(activeStage === 'examination' ? 'all' : 'examination')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  activeStage === 'examination'
                    ? 'bg-burgundy text-white shadow-2xs'
                    : 'bg-ivory-200 text-charcoal-500 border border-beige group-hover:border-burgundy'
                }`}
              >
                4
              </div>
              <div>
                <span className="text-xs font-bold text-charcoal block leading-tight">
                  Rapak & Bimwin
                </span>
                <span className="text-[11px] text-charcoal-400 block">
                  {stageCounts.examination} tugas
                </span>
              </div>
            </button>

          </div>
        </div>

        {/* ── 6. TASK LIST SECTION HEADER & FILTER ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                Daftar Tugas Administrasi ({totalCount})
              </h2>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Lengkapi setiap langkah sesuai kebutuhan profilmu. Urutan ini akan menyesuaikan dengan kondisi kamu.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs font-semibold rounded-xl border border-beige-300 bg-white text-charcoal px-3.5 py-2 shadow-2xs focus:ring-2 focus:ring-burgundy/20 cursor-pointer"
              >
                <option value="all">Semua Persyaratan</option>
                <option value="uncompleted">Hanya yang Belum Siap</option>
                <option value="national_only">Wajib Nasional Saja</option>
                <option value="confirm_kua">Perlu Konfirmasi KUA</option>
              </select>
            </div>
          </div>

          {/* Task Rows List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-beige-200 text-charcoal-400 shadow-soft">
                <p className="text-sm font-medium">Tidak ada item administrasi dalam filter ini.</p>
                <button
                  onClick={() => {
                    setActiveStage('all');
                    setFilterType('all');
                  }}
                  className="mt-3 text-xs text-burgundy font-bold hover:underline"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const tpl = task.templateId ? ADMINISTRATIVE_TEMPLATES[task.templateId] : null;
                const isDone = task.status === 'completed';
                const inProgress = task.status === 'in_progress';

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-4 rounded-2xl border border-beige-200 hover:border-burgundy-200 hover:shadow-soft transition-all flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    {/* Left: Checkbox + Icon + Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusToggle(task.id, isDone ? 'todo' : 'completed');
                        }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isDone
                            ? 'bg-burgundy border-burgundy text-white'
                            : inProgress
                            ? 'border-amber-400 bg-amber-50 text-amber-600'
                            : 'border-beige-300 hover:border-burgundy bg-white'
                        }`}
                        title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                      >
                        {isDone ? '✓' : inProgress ? '…' : null}
                      </button>

                      <div className="w-9 h-9 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-sm font-semibold text-charcoal truncate group-hover:text-burgundy transition-colors ${
                            isDone ? 'line-through text-charcoal-300' : ''
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-charcoal-400 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Badge + Status Pill + Chevron */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {tpl?.metadata.requirementLevel === 'NATIONAL_REQUIREMENT' && (
                        <span className="hidden sm:inline-block px-3 py-1 text-[11px] font-semibold text-burgundy bg-[#FDF2F3] border border-[#F6D5D8] rounded-full">
                          Wajib Nasional
                        </span>
                      )}
                      {tpl?.metadata.requirementLevel === 'LOCAL_SERVICE_PRACTICE' && (
                        <span className="hidden sm:inline-block px-3 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full">
                          Standar KUA
                        </span>
                      )}
                      {tpl?.metadata.requirementLevel === 'CONFIRM_WITH_KUA' && (
                        <span className="hidden sm:inline-block px-3 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full">
                          Konfirmasi KUA
                        </span>
                      )}

                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-lg ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : inProgress
                            ? 'bg-amber-50 text-amber-700 font-semibold'
                            : 'bg-ivory-200 text-charcoal-500'
                        }`}
                      >
                        {isDone ? 'Siap' : inProgress ? 'Proses' : 'Belum'}
                      </span>

                      <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-burgundy transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 7. TRUST & LEGAL DISCLAIMER (WARM FOOTER) ─────────────────────── */}
        <div className="p-6 bg-ivory-50 rounded-2xl border border-beige text-xs text-charcoal-500 space-y-2">
          <div className="flex items-center gap-2 font-bold text-charcoal-700 uppercase tracking-wider text-[11px]">
            <span>⚖️</span>
            <span>Disclaimer & Atribusi Regulasi Resmi</span>
          </div>
          <p className="leading-relaxed">
            WedSiap adalah platform perencanaan pernikahan independen dan bukan perwakilan resmi Kementerian Agama RI atau Kantor Urusan Agama (KUA). Panduan administrasi ini disusun berdasarkan regulasi resmi (<strong>PMA No. 30 Tahun 2024 tentang Pencatatan Pernikahan</strong> dan <strong>PP No. 59 Tahun 2018 tentang Tarif PNBP Kemenag</strong>).
          </p>
          <p className="leading-relaxed">
            Prosedur teknis, format formulir kelurahan, dan jadwal bimbingan perkawinan dapat bervariasi mengikuti kebijakan layanan KUA kecamatan setempat. Selalu lakukan konfirmasi langsung dengan petugas KUA tempat pernikahanmu dilangsungkan.
          </p>
          <p className="text-[10px] text-charcoal-400 pt-1">
            Terakhir ditinjau dan diselaraskan: Januari 2025.
          </p>
        </div>

      </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentModule={currentModule || 'administration'}
        onNavigate={onNavigateModule || (() => {})}
      />

      {/* ── Modals & Drawers ───────────────────────────────────────────────── */}
      <AdministrationSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        initialContext={workspace.administrationContext}
        onSave={handleSaveContext}
      />

      <AdministrationTaskDrawer
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleStatusToggle}
      />
    </div>
  );
};
