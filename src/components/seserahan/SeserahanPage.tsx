import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Gift,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  FolderPlus,
  Layers,
  ChevronRight,
  Check,
  X,
  PackageCheck,
  ShieldCheck,
  UserCheck,
  Calendar,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import {
  SeserahanPlan,
  SeserahanCategory,
  SeserahanItem,
  SeserahanItemStatus,
  ResponsibleParty,
  RESPONSIBLE_PARTIES,
  RESPONSIBLE_PARTY_LABELS,
  ItemDueStatus,
} from '../../domain/seserahan/types';
import { calculateSeserahanMetrics } from '../../domain/seserahan/metrics';
import { classifyItemDueStatus, getDueStatusDisplay } from '../../domain/seserahan/deadlines';
import { SeserahanTemplateType } from '../../domain/seserahan/templates';
import * as seserahanRepo from '../../repositories/seserahanRepository';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import { SeserahanStarterTemplateModal } from './SeserahanStarterTemplateModal';
import { SeserahanItemModal } from './SeserahanItemModal';
import { SeserahanCategoryModal } from './SeserahanCategoryModal';
import { SeserahanBudgetModal } from './SeserahanBudgetModal';

/**
 * Format item-level costs into calm, human-friendly Indonesian compact display
 * e.g., 500000 -> "Rp500 rb", 1500000 -> "Rp1,5 jt"
 */
export function formatShortCost(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'Rp0';
  if (amount >= 1_000_000) {
    const jt = amount / 1_000_000;
    const formatted = jt % 1 === 0 ? jt.toString() : Number(jt.toFixed(1)).toString().replace('.', ',');
    return `Rp${formatted} jt`;
  }
  if (amount >= 1_000) {
    const rb = amount / 1_000;
    const formatted = rb % 1 === 0 ? rb.toString() : Number(rb.toFixed(1)).toString().replace('.', ',');
    return `Rp${formatted} rb`;
  }
  return `Rp${amount.toLocaleString('id-ID')}`;
}

export interface SeserahanPageProps {
  workspace: WorkspaceViewModel;
  storedWorkspace?: StoredWorkspace | null;
  currentModule?: string;
  onNavigateModule?: (module: string) => void;
  initialPlan?: SeserahanPlan | null;
  initialCategories?: SeserahanCategory[];
  initialItems?: SeserahanItem[];
  initialLoading?: boolean;
  initialToast?: { title: string; message: string } | null;
}

export const SeserahanPage: React.FC<SeserahanPageProps> = ({
  workspace,
  storedWorkspace,
  currentModule = 'seserahan',
  onNavigateModule,
  initialPlan,
  initialCategories,
  initialItems,
  initialLoading,
  initialToast,
}) => {
  const workspaceId = storedWorkspace?.id || workspace?.id;
  const weddingDate = storedWorkspace?.weddingDate || workspace?.weddingDate || null;
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Data state
  const [plan, setPlan] = useState<SeserahanPlan | null>(initialPlan ?? null);
  const [categories, setCategories] = useState<SeserahanCategory[]>(initialCategories ?? []);
  const [items, setItems] = useState<SeserahanItem[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(
    initialLoading ?? (initialPlan === undefined)
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [itemModalConfig, setItemModalConfig] = useState<{
    isOpen: boolean;
    itemToEdit?: SeserahanItem | null;
    defaultCategoryId?: string | null;
  }>({ isOpen: false, itemToEdit: null, defaultCategoryId: null });
  const [categoryModalConfig, setCategoryModalConfig] = useState<{
    isOpen: boolean;
    initialName?: string;
    isEditing?: boolean;
    categoryId?: string | null;
  }>({ isOpen: false, initialName: '', isEditing: false, categoryId: null });

  // Confirmation dialogs
  const [deletingCategory, setDeletingCategory] = useState<SeserahanCategory | null>(null);

  // Filters state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'purchased' | 'completed'>('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'due_soon' | 'normal'>('all');
  const [responsibilityFilter, setResponsibilityFilter] = useState<'all' | ResponsibleParty>('all');

  // Polish & UX feedback states
  const [isScrolled, setIsScrolled] = useState(false);
  const [showReadinessReasons, setShowReadinessReasons] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(
    initialToast ?? null
  );
  const [highlightUncategorized, setHighlightUncategorized] = useState(false);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Scroll listener for sticky desktop header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handler: Smooth scroll to category section
  const handleCategoryFilterClick = (filterId: string) => {
    setSelectedCategoryFilter(filterId);
    if (filterId === 'all') {
      const container = document.getElementById('categories-container');
      container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (filterId === 'uncategorized') {
      const el = document.getElementById('category-section-uncategorized');
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      const el = document.getElementById(`category-section-${filterId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Load all seserahan data
  const loadSeserahan = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const existingPlan = await seserahanRepo.getSeserahanPlan(workspaceId);
      setPlan(existingPlan);

      if (existingPlan) {
        const [cats, itms] = await Promise.all([
          seserahanRepo.getSeserahanCategories(existingPlan.id),
          seserahanRepo.getSeserahanItems(existingPlan.id),
        ]);
        setCategories(cats);
        setItems(itms);
      } else {
        setCategories([]);
        setItems([]);
      }
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to load seserahan data:', err);
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Terjadi kendala saat memuat data seserahan. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (initialPlan === undefined) {
      loadSeserahan();
    }
  }, [initialPlan, loadSeserahan]);

  // Derived V2 Metrics
  const metrics = useMemo(() => {
    return calculateSeserahanMetrics(plan?.budget ?? 0, items, plan, today);
  }, [plan, items, today]);

  // Item filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Due date filter
      if (dueFilter !== 'all') {
        const dueStatus = classifyItemDueStatus(item, today);
        if (dueFilter === 'overdue' && dueStatus !== 'overdue') return false;
        if (dueFilter === 'due_soon' && dueStatus !== 'due_soon') return false;
        if (dueFilter === 'normal' && dueStatus !== 'normal') return false;
      }

      // Responsibility filter
      if (responsibilityFilter !== 'all') {
        if (item.responsibleParty !== responsibilityFilter) return false;
      }

      return true;
    });
  }, [items, statusFilter, dueFilter, responsibilityFilter, today]);

  // Categorize filtered items
  const categorizedItems = useMemo(() => {
    const map = new Map<string, SeserahanItem[]>();
    const uncategorized: SeserahanItem[] = [];

    categories.forEach((cat) => map.set(cat.id, []));

    filteredItems.forEach((item) => {
      if (item.categoryId && map.has(item.categoryId)) {
        map.get(item.categoryId)!.push(item);
      } else {
        uncategorized.push(item);
      }
    });

    return { map, uncategorized };
  }, [categories, filteredItems]);

  // Handler: Create Plan from Template
  const handleCreateFromTemplate = async (templateType: SeserahanTemplateType, customBudget: number) => {
    if (!workspaceId) return;
    try {
      const res = await seserahanRepo.createPlanFromTemplate(
        workspaceId,
        templateType,
        customBudget,
        weddingDate
      );
      setPlan(res.plan);
      setCategories(res.categories);
      setItems(res.items);
      setToast({
        title: 'Rencana Seserahan Dibuat',
        message: 'Daftar barang dan rekomendasi jadwal telah disiapkan untukmu.',
      });
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to create plan from template:', err);
      throw err;
    }
  };

  // Handler: Save / Update Budget
  const handleSaveBudget = async (newBudget: number) => {
    if (!workspaceId || !plan) return;
    try {
      const updated = await seserahanRepo.updateSeserahanPlan(workspaceId, plan.id, {
        budget: newBudget,
      });
      setPlan(updated);
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to update budget:', err);
      throw err;
    }
  };

  // Handler: Toggle Packaging Workflow
  const handleTogglePackaging = async (started: boolean, completed: boolean) => {
    if (!workspaceId || !plan) return;
    try {
      const updated = await seserahanRepo.updateSeserahanPackaging(workspaceId, plan.id, started, completed);
      setPlan(updated);
      setToast({
        title: completed ? 'Pengemasan Selesai' : started ? 'Pengemasan Dimulai' : 'Pengemasan Direset',
        message: completed
          ? 'Seluruh kotak seserahan telah selesai dikemas.'
          : started
          ? 'Proses pengemasan kotak sedang berjalan.'
          : 'Status pengemasan kembali ke belum mulai.',
      });
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to update packaging:', err);
      alert(err instanceof Error ? err.message : 'Gagal memperbarui status pengemasan.');
    }
  };

  // Handler: Toggle Final Check
  const handleToggleFinalCheck = async (checked: boolean) => {
    if (!workspaceId || !plan) return;
    try {
      const updated = await seserahanRepo.updateSeserahanFinalCheck(workspaceId, plan.id, checked);
      setPlan(updated);
      setToast({
        title: checked ? 'Pengecekan Akhir Selesai' : 'Pengecekan Dibatalkan',
        message: checked
          ? 'Kotak seserahan telah dicek kelengkapannya dan siap untuk hari-H.'
          : 'Pengecekan akhir belum ditandai.',
      });
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to update final check:', err);
      alert(err instanceof Error ? err.message : 'Gagal memperbarui status pengecekan akhir.');
    }
  };

  // Handler: Save Category (Add / Rename)
  const handleSaveCategory = async (name: string) => {
    if (!plan) return;
    try {
      if (categoryModalConfig.isEditing && categoryModalConfig.categoryId) {
        const updated = await seserahanRepo.updateSeserahanCategory(
          plan.id,
          categoryModalConfig.categoryId,
          { name }
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        const created = await seserahanRepo.createSeserahanCategory(plan.id, {
          name,
          sortOrder: categories.length,
        });
        setCategories((prev) => [...prev, created]);
      }
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to save category:', err);
      throw err;
    }
  };

  // Handler: Delete Category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!plan) return;
    const targetCategory = categories.find((c) => c.id === categoryId);
    const affectedItemsCount = items.filter((item) => item.categoryId === categoryId).length;

    try {
      await seserahanRepo.deleteSeserahanCategory(plan.id, categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setItems((prev) =>
        prev.map((item) => (item.categoryId === categoryId ? { ...item, categoryId: null } : item))
      );
      setDeletingCategory(null);

      setToast({
        title: 'Kategori dihapus',
        message:
          affectedItemsCount > 0
            ? 'Barang di dalamnya tetap aman dan dipindahkan ke Tanpa Kategori.'
            : `Kategori ${targetCategory ? `"${targetCategory.name}" ` : ''}telah dihapus.`,
      });

      if (affectedItemsCount > 0) {
        setHighlightUncategorized(true);
        setTimeout(() => setHighlightUncategorized(false), 4000);
        setTimeout(() => {
          const uncatEl = document.getElementById('category-section-uncategorized');
          uncatEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      }
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to delete category:', err);
      alert(err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    }
  };

  // Handler: Save Item (Add / Edit)
  const handleSaveItem = async (payload: {
    categoryId: string | null;
    name: string;
    status: SeserahanItemStatus;
    estimatedCost: number;
    actualCost: number;
    notes: string | null;
    responsibleParty: ResponsibleParty | null;
    responsiblePartyCustom: string | null;
    dueDate: string | null;
  }) => {
    if (!plan) return;
    try {
      if (itemModalConfig.itemToEdit) {
        const updated = await seserahanRepo.updateSeserahanItem(
          plan.id,
          itemModalConfig.itemToEdit.id,
          payload
        );
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        const created = await seserahanRepo.createSeserahanItem(plan.id, {
          ...payload,
          sortOrder: items.length,
        });
        setItems((prev) => [...prev, created]);
      }
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to save item:', err);
      throw err;
    }
  };

  // Handler: Quick Status Cycle
  const handleCycleStatus = async (item: SeserahanItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plan) return;

    const nextStatus: Record<SeserahanItemStatus, SeserahanItemStatus> = {
      planned: 'purchased',
      purchased: 'completed',
      completed: 'planned',
    };
    const targetStatus = nextStatus[item.status];

    const prevItems = items;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: targetStatus } : i))
    );

    try {
      await seserahanRepo.updateSeserahanItem(plan.id, item.id, { status: targetStatus });
    } catch (err) {
      console.error('[SeserahanPage] Failed to cycle status:', err);
      setItems(prevItems);
    }
  };

  // Handler: Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!plan) return;
    try {
      await seserahanRepo.deleteSeserahanItem(plan.id, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to delete item:', err);
      throw err;
    }
  };

  // Readiness badge color configuration
  const readinessBadgeConfig = useMemo(() => {
    switch (metrics.readinessStatus) {
      case 'ready':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'almost_ready':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'in_progress':
        return {
          bg: 'bg-burgundy/10 text-burgundy border-burgundy/20',
          dot: 'bg-burgundy',
        };
      case 'not_ready':
      default:
        return {
          bg: 'bg-beige/40 text-charcoal-600 border-beige-300',
          dot: 'bg-charcoal-400',
        };
    }
  }, [metrics.readinessStatus]);

  const getStatusBadge = (status: SeserahanItemStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Selesai</span>
          </span>
        );
      case 'purchased':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <ShoppingBag className="w-3 h-3" />
            <span>Sudah dibeli</span>
          </span>
        );
      case 'planned':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ivory-100 text-charcoal-700 border border-beige-400">
            <Clock className="w-3 h-3 text-charcoal-500" />
            <span>Belum disiapkan</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={(mod: string) => onNavigateModule?.(mod)}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate}
        workspaceId={workspace.id}
      />

      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Mobile Header */}
        <MobileModuleHeader
          title="Seserahan"
          onBack={() => onNavigateModule?.('dashboard')}
          rightAction={
            plan ? (
              <button
                type="button"
                onClick={() =>
                  setItemModalConfig({ isOpen: true, itemToEdit: null, defaultCategoryId: null })
                }
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-burgundy text-white hover:bg-burgundy-700 shadow-2xs transition-colors cursor-pointer"
                aria-label="Tambah barang"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : null
          }
        />

        {/* Desktop Sticky Header */}
        <div
          className={`hidden md:block sticky top-0 z-20 bg-ivory/95 backdrop-blur-xs transition-shadow duration-200 border-b border-beige-300 ${
            isScrolled ? 'shadow-xs' : ''
          }`}
        >
          <div className="max-w-5xl w-full mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateModule?.('dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 hover:text-burgundy transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <div className="h-4 w-px bg-beige-300" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-burgundy/10 flex items-center justify-center text-burgundy">
                  <Gift className="w-4 h-4" />
                </div>
                <h1 className="font-serif text-xl font-bold text-charcoal">Seserahan</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-gold/15 text-gold-700 border border-gold/30">
                  V2 Planning
                </span>
              </div>
            </div>

            {plan && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setCategoryModalConfig({ isOpen: true, isEditing: false, initialName: '' })
                  }
                  className="px-3.5 py-1.5 rounded-xl border border-beige-300 hover:bg-ivory-100 text-charcoal text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-charcoal-500" />
                  <span>+ Kategori</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setItemModalConfig({ isOpen: true, itemToEdit: null, defaultCategoryId: null })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Barang</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-6 animate-pulse" data-testid="seserahan-skeleton">
              <div className="h-28 bg-white rounded-3xl border border-beige-300" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-24 bg-white rounded-2xl border border-beige-300" />
                <div className="h-24 bg-white rounded-2xl border border-beige-300" />
                <div className="h-24 bg-white rounded-2xl border border-beige-300" />
                <div className="h-24 bg-white rounded-2xl border border-beige-300" />
              </div>
            </div>
          )}

          {/* Calm Error State */}
          {!isLoading && loadError && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 border border-rose-200 text-center max-w-md mx-auto space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  Seserahan belum dapat dimuat
                </h3>
                <p className="text-xs text-charcoal-500 mt-1">
                  Koneksi terputus atau terjadi kendala sementara. Silakan coba kembali.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSeserahan}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-burgundy text-white text-xs font-semibold shadow-2xs hover:bg-burgundy-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* Empty State (No Plan Exists) */}
          {!isLoading && !loadError && !plan && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-beige-300 shadow-card text-center max-w-lg mx-auto space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-burgundy/10 flex items-center justify-center text-burgundy mx-auto shadow-inner">
                <Gift className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                  Belum menyusun seserahan
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-500 max-w-sm mx-auto leading-relaxed">
                  Mulai susun daftar hantaran, pembagian penanggung jawab, dan tenggat waktu agar siap tepat waktu untuk hari-H.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>Mulai Susun Seserahan</span>
                </button>
              </div>
            </div>
          )}

          {/* Populated Plan Surface (V2 Complete Experience) */}
          {!isLoading && !loadError && plan && (
            <div className="space-y-6 animate-fadeIn">
              {/* 1. COMPACT READINESS HEADER */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${readinessBadgeConfig.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${readinessBadgeConfig.dot}`} />
                        <span>{metrics.readiness.label}</span>
                      </span>
                      <span className="text-xs font-medium text-charcoal-500">
                        {metrics.completedItems}/{metrics.totalItems} barang tersedia
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-charcoal">
                      {metrics.readiness.targetMilestone || 'Target: Semua siap H-14'}
                    </p>
                  </div>

                  {/* Quick Urgency Callouts */}
                  <div className="flex flex-wrap items-center gap-2">
                    {metrics.overdueItems > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{metrics.overdueItems} Terlambat</span>
                      </span>
                    )}
                    {metrics.dueSoonItems > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{metrics.dueSoonItems} Jatuh Tempo Segera</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowReadinessReasons(!showReadinessReasons)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-charcoal-500 hover:text-charcoal hover:bg-beige-100 border border-beige-300 transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{showReadinessReasons ? 'Tutup Detail' : 'Detail Kesiapan'}</span>
                    </button>
                  </div>
                </div>

                {/* Explainable Reasons Accordion */}
                {showReadinessReasons && (
                  <div className="pt-3 border-t border-beige space-y-2 animate-fadeIn text-xs text-charcoal-600 bg-ivory-50/60 p-3 rounded-xl">
                    <span className="font-semibold text-charcoal block">Fakta Kondisi Seserahan:</span>
                    <ul className="space-y-1 pl-4 list-disc marker:text-burgundy">
                      {metrics.readiness.reasons.map((reason, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 2. FOUR COMPACT SUMMARY METRICS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Metric 1: Barang */}
                <div className="bg-white rounded-2xl p-4 border border-beige-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal-400">
                    <span>Barang</span>
                    <span className="text-burgundy">{metrics.completionRate}%</span>
                  </div>
                  <div className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                    {metrics.completedItems} / {metrics.totalItems}
                    <span className="text-xs font-normal text-charcoal-400 ml-1">tersedia</span>
                  </div>
                  <div className="w-full bg-ivory-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-burgundy h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, metrics.completionRate)}%` }}
                    />
                  </div>
                </div>

                {/* Metric 2: Budget */}
                <div className="bg-white rounded-2xl p-4 border border-beige-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal-400">
                    <span>Budget</span>
                    <button
                      type="button"
                      onClick={() => setIsBudgetModalOpen(true)}
                      className="text-burgundy hover:underline cursor-pointer"
                    >
                      Atur
                    </button>
                  </div>
                  <div className="text-base sm:text-lg font-serif font-bold text-charcoal truncate">
                    {formatShortCost(metrics.actualTotal)}
                    <span className="text-xs font-normal text-charcoal-400 ml-1">
                      / {formatShortCost(metrics.budget)}
                    </span>
                  </div>
                  <div className="text-[11px] text-charcoal-400 truncate">
                    {metrics.remainingBudget >= 0
                      ? `Sisa ${formatShortCost(metrics.remainingBudget)}`
                      : `Defisit ${formatShortCost(Math.abs(metrics.remainingBudget))}`}
                  </div>
                </div>

                {/* Metric 3: Pengemasan */}
                <div className="bg-white rounded-2xl p-4 border border-beige-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal-400">
                    <span>Pengemasan</span>
                    <PackageCheck className="w-3.5 h-3.5 text-charcoal-400" />
                  </div>
                  <div className="text-base sm:text-lg font-serif font-bold text-charcoal">
                    {metrics.packagingCompleted
                      ? 'Selesai'
                      : metrics.packagingStarted
                      ? 'Sedang dikemas'
                      : 'Belum mulai'}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {!metrics.packagingCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleTogglePackaging(true, metrics.packagingStarted)}
                        className="text-[11px] font-semibold text-burgundy hover:underline cursor-pointer"
                      >
                        {metrics.packagingStarted ? 'Tandai Selesai' : 'Mulai Kemas'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTogglePackaging(false, false)}
                        className="text-[11px] text-charcoal-400 hover:text-rose-600 cursor-pointer"
                      >
                        Atur Ulang
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric 4: Deadline & Final Check */}
                <div className="bg-white rounded-2xl p-4 border border-beige-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal-400">
                    <span>Deadline</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-charcoal-400" />
                  </div>
                  <div className="text-base sm:text-lg font-serif font-bold text-charcoal truncate">
                    {metrics.overdueItems > 0
                      ? `${metrics.overdueItems} terlambat`
                      : metrics.dueSoonItems > 0
                      ? `${metrics.dueSoonItems} segera`
                      : 'Aman'}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
                    {metrics.finalCheckCompleted ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sudah dicek
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleFinalCheck(true)}
                        className="font-semibold text-burgundy hover:underline cursor-pointer"
                      >
                        Tandai Dicek (H-1)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Warning Banner if approaching/exceeding */}
              {metrics.budget > 0 && metrics.estimatedRemainingCost > metrics.remainingBudget && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-3 text-xs text-amber-900 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="leading-relaxed">
                    <span className="font-semibold">Catatan:</span> Total estimasi belanja tersisa mendekati batas budget yang direncanakan (berpotensi melebihi Rp
                    {(metrics.estimatedRemainingCost - metrics.remainingBudget).toLocaleString('id-ID')}).
                  </p>
                </div>
              )}

              {/* 3. LIFECYCLE WORKFLOW CONTROL BANNER */}
              <div className="p-4 bg-ivory-50/80 border border-beige-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center text-gold-800 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-charcoal">Tahap Akhir Seserahan</h4>
                    <p className="text-[11px] text-charcoal-500">
                      Pengemasan kotak (H-7) dan pengecekan kelengkapan sebelum dibawa ke lokasi acara (H-1).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!metrics.packagingCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleTogglePackaging(true, true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-beige-300 hover:bg-beige-50 text-charcoal text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5 text-burgundy" />
                      <span>Pengemasan Selesai</span>
                    </button>
                  ) : null}

                  {!metrics.finalCheckCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleToggleFinalCheck(true)}
                      className="px-3 py-1.5 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pengecekan Akhir Selesai</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleFinalCheck(false)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sudah Dicek (Batal)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4. FILTERS & CONTROLS */}
              <div className="space-y-3">
                {/* Category Tabs */}
                {categories.length > 0 && (
                  <div
                    id="category-filter-bar"
                    className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5"
                    role="tablist"
                    aria-label="Filter Kategori Seserahan"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selectedCategoryFilter === 'all'}
                      onClick={() => handleCategoryFilterClick('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-burgundy text-white shadow-2xs'
                          : 'bg-white text-charcoal-600 border border-beige-300 hover:bg-ivory-100'
                      }`}
                    >
                      <span>Semua</span>
                      <span
                        className={`text-[10px] font-normal px-1.5 py-0.2 rounded-full ${
                          selectedCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-beige-100 text-charcoal-400'
                        }`}
                      >
                        {metrics.completedItems}/{metrics.totalItems}
                      </span>
                    </button>

                    {categories.map((category) => {
                      const catItems = categorizedItems.map.get(category.id) || [];
                      const catCompleted = catItems.filter((i) => i.status === 'completed').length;
                      const isSelected = selectedCategoryFilter === category.id;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => handleCategoryFilterClick(category.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-burgundy text-white shadow-2xs'
                              : 'bg-white text-charcoal-600 border border-beige-300 hover:bg-ivory-100'
                          }`}
                        >
                          <span>{category.name}</span>
                          <span
                            className={`text-[10px] font-normal px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-beige-100 text-charcoal-400'
                            }`}
                          >
                            {catCompleted}/{catItems.length}
                          </span>
                        </button>
                      );
                    })}

                    {categorizedItems.uncategorized.length > 0 && (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedCategoryFilter === 'uncategorized'}
                        onClick={() => handleCategoryFilterClick('uncategorized')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          selectedCategoryFilter === 'uncategorized'
                            ? 'bg-burgundy text-white shadow-2xs'
                            : 'bg-white text-charcoal-600 border border-beige-300 hover:bg-ivory-100'
                        }`}
                      >
                        <span>Tanpa Kategori</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-beige-100 text-charcoal-400">
                          {categorizedItems.uncategorized.length}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Sub-Filters: Status, Deadline, Penanggung Jawab */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-beige-300 rounded-xl text-xs text-charcoal font-medium outline-none cursor-pointer"
                    aria-label="Filter status barang"
                  >
                    <option value="all">Status: Semua</option>
                    <option value="planned">Belum disiapkan</option>
                    <option value="purchased">Sudah dibeli</option>
                    <option value="completed">Selesai</option>
                  </select>

                  {/* Deadline Filter */}
                  <select
                    value={dueFilter}
                    onChange={(e) => setDueFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-beige-300 rounded-xl text-xs text-charcoal font-medium outline-none cursor-pointer"
                    aria-label="Filter tenggat waktu"
                  >
                    <option value="all">Tenggat: Semua</option>
                    <option value="overdue">Terlambat</option>
                    <option value="due_soon">Segera (≤ 7 hari)</option>
                    <option value="normal">Aman</option>
                  </select>

                  {/* Responsibility Filter */}
                  <select
                    value={responsibilityFilter}
                    onChange={(e) => setResponsibilityFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-beige-300 rounded-xl text-xs text-charcoal font-medium outline-none cursor-pointer"
                    aria-label="Filter pihak penanggung jawab"
                  >
                    <option value="all">PIC: Semua Pihak</option>
                    {RESPONSIBLE_PARTIES.map((p) => (
                      <option key={p} value={p}>
                        {RESPONSIBLE_PARTY_LABELS[p]}
                      </option>
                    ))}
                  </select>

                  {(statusFilter !== 'all' || dueFilter !== 'all' || responsibilityFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all');
                        setDueFilter('all');
                        setResponsibilityFilter('all');
                      }}
                      className="text-xs text-burgundy hover:underline cursor-pointer px-2"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* 5. CATEGORIES & ITEMS LIST */}
              <div id="categories-container" className="space-y-5">
                {categories.map((category) => {
                  const catItems = categorizedItems.map.get(category.id) || [];
                  const isFilteredOut =
                    selectedCategoryFilter !== 'all' && selectedCategoryFilter !== category.id;

                  if (isFilteredOut) return null;

                  return (
                    <div
                      key={category.id}
                      id={`category-section-${category.id}`}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-card overflow-hidden"
                    >
                      {/* Category Header */}
                      <div className="p-4 sm:p-5 bg-ivory-50/70 border-b border-beige flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <h4 className="font-serif text-base font-bold text-charcoal tracking-wide truncate">
                            {category.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-charcoal-400 bg-white px-2 py-0.5 rounded-full border border-beige-300 shrink-0">
                            {catItems.length} item
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCategoryModalConfig({
                                isOpen: true,
                                isEditing: true,
                                categoryId: category.id,
                                initialName: category.name,
                              })
                            }
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-charcoal-400 hover:text-charcoal hover:bg-beige-100 transition-colors cursor-pointer"
                            title="Edit nama kategori"
                            aria-label={`Ubah nama kategori ${category.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(category)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus kategori"
                            aria-label={`Hapus kategori ${category.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items Rows */}
                      <div className="divide-y divide-beige">
                        {catItems.length === 0 ? (
                          <div className="p-5 text-center text-xs text-charcoal-400">
                            Belum ada barang di kategori ini.
                          </div>
                        ) : (
                          catItems.map((item) => {
                            const dueStatus = classifyItemDueStatus(item, today);
                            const dueDisplay = getDueStatusDisplay(dueStatus);
                            const respLabel = item.responsibleParty
                              ? item.responsibleParty === 'custom'
                                ? item.responsiblePartyCustom || 'Lainnya'
                                : RESPONSIBLE_PARTY_LABELS[item.responsibleParty]
                              : null;

                            return (
                              <div
                                key={item.id}
                                className="p-3 sm:p-4 hover:bg-ivory-50/80 transition-colors flex items-center gap-2 sm:gap-3 group"
                              >
                                {/* Clickable Status Indicator */}
                                <button
                                  type="button"
                                  onClick={(e) => handleCycleStatus(item, e)}
                                  className="w-10 h-10 shrink-0 flex items-center justify-center text-charcoal-400 hover:text-burgundy rounded-xl hover:bg-ivory-200 active:scale-95 transition-all cursor-pointer"
                                  title="Klik untuk ubah status"
                                  aria-label={`Ubah status ${item.name}`}
                                >
                                  {item.status === 'completed' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                                  ) : item.status === 'purchased' ? (
                                    <ShoppingBag className="w-5 h-5 text-amber-600" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-charcoal-300 hover:border-burgundy" />
                                  )}
                                </button>

                                {/* Item Content */}
                                <div
                                  onClick={() =>
                                    setItemModalConfig({
                                      isOpen: true,
                                      itemToEdit: item,
                                      defaultCategoryId: category.id,
                                    })
                                  }
                                  className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer py-1 -my-1 rounded-lg px-1.5 -mx-1.5 hover:bg-white/60 transition-colors"
                                >
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`text-sm font-medium leading-snug line-clamp-2 ${
                                          item.status === 'completed'
                                            ? 'text-charcoal-400 line-through'
                                            : 'text-charcoal'
                                        }`}
                                      >
                                        {item.name}
                                      </span>

                                      {/* Responsible Party Tag */}
                                      {respLabel && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-beige/40 text-charcoal-600 border border-beige-300 font-medium">
                                          {respLabel}
                                        </span>
                                      )}

                                      {/* Due Date Tag */}
                                      {item.dueDate && (
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${dueDisplay.badgeClass}`}
                                        >
                                          <Calendar className="w-2.5 h-2.5" />
                                          <span>{dueDisplay.label} ({item.dueDate})</span>
                                        </span>
                                      )}
                                    </div>

                                    {item.notes && (
                                      <span className="text-[11px] text-charcoal-400 block line-clamp-1 mt-0.5">
                                        {item.notes}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                    <div className="hidden sm:block">
                                      {getStatusBadge(item.status)}
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end">
                                      {item.actualCost > 0 ? (
                                        <>
                                          <span className="text-xs font-semibold text-charcoal-700">
                                            {formatShortCost(item.actualCost)}
                                          </span>
                                          {item.estimatedCost > 0 && item.estimatedCost !== item.actualCost && (
                                            <span className="text-[10px] text-charcoal-400">
                                              Est. {formatShortCost(item.estimatedCost)}
                                            </span>
                                          )}
                                        </>
                                      ) : item.estimatedCost > 0 ? (
                                        <span className="text-xs font-medium text-charcoal-600">
                                          Est. {formatShortCost(item.estimatedCost)}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-charcoal-300">-</span>
                                      )}
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-charcoal-300 group-hover:text-charcoal-600 transition-colors shrink-0" />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add Item to Category */}
                      <div className="p-3 bg-ivory-50/40 border-t border-beige">
                        <button
                          type="button"
                          onClick={() =>
                            setItemModalConfig({
                              isOpen: true,
                              itemToEdit: null,
                              defaultCategoryId: category.id,
                            })
                          }
                          className="w-full py-2 rounded-xl text-xs font-semibold text-burgundy hover:bg-white border border-dashed border-burgundy/30 hover:border-burgundy transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Item ke {category.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Uncategorized Items Section */}
                {categorizedItems.uncategorized.length > 0 &&
                  (selectedCategoryFilter === 'all' || selectedCategoryFilter === 'uncategorized') && (
                    <div
                      id="category-section-uncategorized"
                      className={`bg-white rounded-2xl sm:rounded-3xl border ${
                        highlightUncategorized
                          ? 'ring-2 ring-burgundy/40 border-burgundy/50 shadow-md'
                          : 'border-beige-300 shadow-card'
                      } overflow-hidden transition-all duration-500`}
                    >
                      <div className="p-4 sm:p-5 bg-ivory-50/70 border-b border-beige flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-base font-bold text-charcoal tracking-wide">
                            Tanpa Kategori
                          </h4>
                          {highlightUncategorized && (
                            <span className="text-[10px] bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full font-medium animate-pulse">
                              Item dipindahkan ke sini
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-charcoal-400 bg-white px-2 py-0.5 rounded-full border border-beige-300">
                          {categorizedItems.uncategorized.length} item
                        </span>
                      </div>

                      <div className="divide-y divide-beige">
                        {categorizedItems.uncategorized.map((item) => {
                          const dueStatus = classifyItemDueStatus(item, today);
                          const dueDisplay = getDueStatusDisplay(dueStatus);
                          const respLabel = item.responsibleParty
                            ? item.responsibleParty === 'custom'
                              ? item.responsiblePartyCustom || 'Lainnya'
                              : RESPONSIBLE_PARTY_LABELS[item.responsibleParty]
                            : null;

                          return (
                            <div
                              key={item.id}
                              className="p-3 sm:p-4 hover:bg-ivory-50/80 transition-colors flex items-center gap-2 sm:gap-3 group"
                            >
                              <button
                                type="button"
                                onClick={(e) => handleCycleStatus(item, e)}
                                className="w-10 h-10 shrink-0 flex items-center justify-center text-charcoal-400 hover:text-burgundy rounded-xl hover:bg-ivory-200 active:scale-95 transition-all cursor-pointer"
                                title="Klik untuk ubah status"
                                aria-label={`Ubah status ${item.name}`}
                              >
                                {item.status === 'completed' ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                                ) : item.status === 'purchased' ? (
                                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-charcoal-300 hover:border-burgundy" />
                                )}
                              </button>

                              <div
                                onClick={() =>
                                  setItemModalConfig({
                                    isOpen: true,
                                    itemToEdit: item,
                                    defaultCategoryId: null,
                                  })
                                }
                                className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer py-1 -my-1 rounded-lg px-1.5 -mx-1.5 hover:bg-white/60 transition-colors"
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-sm font-medium leading-snug line-clamp-2 ${
                                        item.status === 'completed'
                                          ? 'text-charcoal-400 line-through'
                                          : 'text-charcoal'
                                      }`}
                                    >
                                      {item.name}
                                    </span>
                                    {respLabel && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-beige/40 text-charcoal-600 border border-beige-300 font-medium">
                                        {respLabel}
                                      </span>
                                    )}
                                    {item.dueDate && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${dueDisplay.badgeClass}`}
                                      >
                                        <Calendar className="w-2.5 h-2.5" />
                                        <span>{dueDisplay.label} ({item.dueDate})</span>
                                      </span>
                                    )}
                                  </div>
                                  {item.notes && (
                                    <span className="text-[11px] text-charcoal-400 block line-clamp-1 mt-0.5">
                                      {item.notes}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  <div className="hidden sm:block">
                                    {getStatusBadge(item.status)}
                                  </div>
                                  <div className="flex flex-col items-start sm:items-end">
                                    {item.actualCost > 0 ? (
                                      <>
                                        <span className="text-xs font-semibold text-charcoal-700">
                                          {formatShortCost(item.actualCost)}
                                        </span>
                                        {item.estimatedCost > 0 && item.estimatedCost !== item.actualCost && (
                                          <span className="text-[10px] text-charcoal-400">
                                            Est. {formatShortCost(item.estimatedCost)}
                                          </span>
                                        )}
                                      </>
                                    ) : item.estimatedCost > 0 ? (
                                      <span className="text-xs font-medium text-charcoal-600">
                                        Est. {formatShortCost(item.estimatedCost)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-charcoal-300">-</span>
                                    )}
                                  </div>

                                  <ChevronRight className="w-4 h-4 text-charcoal-300 group-hover:text-charcoal-600 transition-colors shrink-0" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </main>

        {/* Category Deletion Confirmation Modal */}
        {deletingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-fadeIn">
            <div
              className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-6 relative space-y-4 animate-scaleUp"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  Hapus Kategori "{deletingCategory.name}"?
                </h3>
                <p className="text-xs text-charcoal-500 leading-relaxed">
                  Barang di dalam kategori ini tidak akan dihapus. Semua item akan dipindahkan ke kategori{' '}
                  <span className="font-semibold text-charcoal">"Tanpa Kategori"</span> agar tetap aman.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-beige-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(deletingCategory.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  Ya, Hapus Kategori
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Feedback */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            data-testid="category-deletion-toast"
            className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full bg-charcoal text-white rounded-2xl p-4 shadow-xl border border-charcoal-700 flex items-start gap-3 animate-fadeIn"
          >
            <div className="w-6 h-6 rounded-lg bg-burgundy flex items-center justify-center text-white shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h5 className="text-xs font-bold text-ivory">{toast.title}</h5>
              <p className="text-[11px] text-charcoal-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-charcoal-400 hover:text-white transition-colors p-1 cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modals */}
        <SeserahanStarterTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSubmit={handleCreateFromTemplate}
        />

        <SeserahanBudgetModal
          isOpen={isBudgetModalOpen}
          currentBudget={plan?.budget || 0}
          onClose={() => setIsBudgetModalOpen(false)}
          onSave={handleSaveBudget}
        />

        <SeserahanCategoryModal
          isOpen={categoryModalConfig.isOpen}
          initialName={categoryModalConfig.initialName}
          isEditing={categoryModalConfig.isEditing}
          onClose={() =>
            setCategoryModalConfig({ isOpen: false, initialName: '', isEditing: false, categoryId: null })
          }
          onSave={handleSaveCategory}
        />

        <SeserahanItemModal
          isOpen={itemModalConfig.isOpen}
          itemToEdit={itemModalConfig.itemToEdit}
          defaultCategoryId={itemModalConfig.defaultCategoryId}
          categories={categories}
          weddingDate={weddingDate}
          onClose={() =>
            setItemModalConfig({ isOpen: false, itemToEdit: null, defaultCategoryId: null })
          }
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
        />

        {/* Mobile Navigation */}
        <MobileBottomNav
          currentModule={currentModule}
          onNavigate={(mod: string) => onNavigateModule?.(mod)}
        />
      </div>
    </div>
  );
};
