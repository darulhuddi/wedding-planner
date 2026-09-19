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
} from 'lucide-react';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import {
  SeserahanPlan,
  SeserahanCategory,
  SeserahanItem,
  SeserahanItemStatus,
  SeserahanMetrics,
} from '../../domain/seserahan/types';
import { calculateSeserahanMetrics } from '../../domain/seserahan/metrics';
import { SeserahanTemplateType } from '../../domain/seserahan/templates';
import * as seserahanRepo from '../../repositories/seserahanRepository';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import { SeserahanStarterTemplateModal } from './SeserahanStarterTemplateModal';
import { SeserahanItemModal } from './SeserahanItemModal';
import { SeserahanCategoryModal } from './SeserahanCategoryModal';
import { SeserahanBudgetModal } from './SeserahanBudgetModal';
import { formatCompactRupiah } from '../../domain/workspaceSelectors';

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

  // Polish & UX feedback states
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
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
    if (!workspaceId || initialPlan !== undefined) {
      if (initialPlan !== undefined) {
        setIsLoading(initialLoading ?? false);
      } else {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const activePlan = await seserahanRepo.getSeserahanPlan(workspaceId);
      setPlan(activePlan);

      if (activePlan) {
        const [loadedCats, loadedItems] = await Promise.all([
          seserahanRepo.getSeserahanCategories(activePlan.id),
          seserahanRepo.getSeserahanItems(activePlan.id),
        ]);
        setCategories(loadedCats);
        setItems(loadedItems);
      } else {
        setCategories([]);
        setItems([]);
      }
    } catch (err: unknown) {
      console.error('[SeserahanPage] Failed to load seserahan data:', err);
      setLoadError('Seserahan belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadSeserahan();
  }, [loadSeserahan]);

  // Derived metrics from domain calculation
  const metrics: SeserahanMetrics = useMemo(() => {
    return calculateSeserahanMetrics(plan?.budget || 0, items);
  }, [plan?.budget, items]);

  // Handler: Create Plan from Template
  const handleCreateFromTemplate = async (templateType: SeserahanTemplateType, budget: number) => {
    if (!workspaceId) return;
    try {
      const res = await seserahanRepo.createPlanFromTemplate(workspaceId, templateType, budget);
      setPlan(res.plan);
      setCategories(res.categories);
      setItems(res.items);
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
      // Re-assign items belonging to this category to null in memory
      setItems((prev) =>
        prev.map((item) => (item.categoryId === categoryId ? { ...item, categoryId: null } : item))
      );
      setDeletingCategory(null);

      // Toast feedback: calm, non-alarming microcopy
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

    // Optimistic update
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

  // Group items by category
  const categorizedItems = useMemo(() => {
    const map = new Map<string, SeserahanItem[]>();
    for (const cat of categories) {
      map.set(cat.id, []);
    }
    const uncategorized: SeserahanItem[] = [];

    for (const item of items) {
      if (item.categoryId && map.has(item.categoryId)) {
        map.get(item.categoryId)!.push(item);
      } else {
        uncategorized.push(item);
      }
    }

    return { map, uncategorized };
  }, [categories, items]);

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row">
      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={(mod) => onNavigateModule?.(mod)}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate}
        workspaceId={workspaceId}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-12">
        {/* Mobile Header */}
        <MobileModuleHeader
          title="Seserahan"
          icon={<Gift className="w-4 h-4" />}
          onBack={() => onNavigateModule?.('dashboard')}
          rightAction={
            plan ? (
              <button
                type="button"
                onClick={() =>
                  setItemModalConfig({ isOpen: true, itemToEdit: null, defaultCategoryId: null })
                }
                className="w-8 h-8 rounded-full bg-burgundy flex items-center justify-center text-white shadow-2xs cursor-pointer"
                aria-label="Tambah barang seserahan"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : null
          }
        />

        {/* Desktop Header & Back to Dashboard */}
        <div
          className={`hidden md:block border-b border-beige bg-white/80 backdrop-blur-md sticky top-0 z-20 px-6 lg:px-8 py-4 transition-shadow duration-200 ${
            isScrolled ? 'shadow-xs border-beige-300' : ''
          }`}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateModule?.('dashboard')}
                className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-400 hover:text-charcoal hover:bg-ivory-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
              {/* Summary cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
                <div className="md:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-24 bg-beige-200 rounded" />
                    <div className="h-4 w-10 bg-beige-200 rounded" />
                  </div>
                  <div className="h-7 w-36 bg-beige-200 rounded" />
                  <div className="h-2.5 w-full bg-beige-100 rounded-full" />
                </div>
                <div className="md:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-24 bg-beige-200 rounded" />
                    <div className="h-6 w-20 bg-beige-200 rounded-lg" />
                  </div>
                  <div className="h-7 w-40 bg-beige-200 rounded" />
                  <div className="h-2.5 w-full bg-beige-100 rounded-full" />
                </div>
              </div>

              {/* Filter chips skeleton */}
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-white rounded-full border border-beige-300" />
                <div className="h-8 w-24 bg-white rounded-full border border-beige-300" />
                <div className="h-8 w-28 bg-white rounded-full border border-beige-300" />
              </div>

              {/* Category & item rows skeleton */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 overflow-hidden divide-y divide-beige">
                <div className="p-4 sm:p-5 bg-ivory-50/70 flex justify-between items-center">
                  <div className="h-5 w-32 bg-beige-200 rounded" />
                  <div className="h-8 w-16 bg-beige-100 rounded-lg" />
                </div>
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-beige-200" />
                    <div className="h-4 w-44 bg-beige-200 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-beige-200 rounded" />
                </div>
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-beige-200" />
                    <div className="h-4 w-36 bg-beige-200 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-beige-200 rounded" />
                </div>
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
                  Mulai susun daftar hantaran dan atur budgetnya dalam satu tempat. Setiap hantaran punya makna.
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

          {/* Populated Plan Surface */}
          {!isLoading && !loadError && plan && (
            <div className="space-y-6 animate-fadeIn">
              {/* SUMMARY SECTION: Progress + Budget */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
                {/* Card 1: Progress Barang */}
                <div className="md:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
                        Progress Barang
                      </span>
                      <span className="font-serif text-base font-bold text-burgundy">
                        {metrics.completionRate}%
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-serif text-2xl font-bold text-charcoal">
                        {metrics.completedItems}{' '}
                        <span className="text-sm font-normal text-charcoal-400">
                          dari {metrics.totalItems} item selesai
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="w-full bg-ivory-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-burgundy h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, metrics.completionRate)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-charcoal-400">
                      <span>{metrics.purchasedItems} dibeli</span>
                      <span>{metrics.pendingItems} belum disiapkan</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Status Budget */}
                <div className="md:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
                        Status Budget
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <h3 className="font-serif text-2xl font-bold text-charcoal">
                          Rp{metrics.actualTotal.toLocaleString('id-ID')}
                        </h3>
                        <span className="text-xs text-charcoal-400">
                          / Rp{metrics.budget.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsBudgetModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-charcoal-500 hover:text-charcoal hover:bg-beige-100 border border-beige-300 transition-colors cursor-pointer"
                    >
                      Atur Budget
                    </button>
                  </div>

                  {/* Budget Progress & Remaining */}
                  <div className="space-y-2">
                    <div className="w-full bg-ivory-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          metrics.remainingBudget < 0 ? 'bg-rose-500' : 'bg-gold-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            metrics.budget > 0 ? (metrics.actualTotal / metrics.budget) * 100 : 0
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-charcoal-400">
                        Estimasi total: Rp{metrics.estimatedTotal.toLocaleString('id-ID')}
                      </span>
                      <span
                        className={`font-semibold ${
                          metrics.remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {metrics.remainingBudget < 0
                          ? `Melebihi Rp${Math.abs(metrics.remainingBudget).toLocaleString('id-ID')}`
                          : `Sisa Rp${metrics.remainingBudget.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtle Financial Warning Bar (Direct calculation, not AI) */}
              {metrics.remainingBudget >= 0 &&
                metrics.estimatedRemainingCost > metrics.remainingBudget && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-3 text-xs text-amber-900 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="leading-relaxed">
                      <span className="font-semibold">Catatan:</span> Total estimasi belanja tersisa mendekati batas budget yang direncanakan (berpotensi melebihi Rp
                      {(metrics.estimatedRemainingCost - metrics.remainingBudget).toLocaleString('id-ID')}).
                    </p>
                  </div>
                )}

              {/* QUICK CATEGORY FILTER BAR */}
              {categories.length > 0 && (
                <div
                  id="category-filter-bar"
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 -mx-0.5"
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
                      <span
                        className={`text-[10px] font-normal px-1.5 py-0.2 rounded-full ${
                          selectedCategoryFilter === 'uncategorized'
                            ? 'bg-white/20 text-white'
                            : 'bg-beige-100 text-charcoal-400'
                        }`}
                      >
                        {categorizedItems.uncategorized.length}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* CATEGORIES & ITEMS LIST */}
              <div id="categories-container" className="space-y-5">
                {categories.map((category) => {
                  const catItems = categorizedItems.map.get(category.id) || [];
                  const catCompleted = catItems.filter((i) => i.status === 'completed').length;

                  return (
                    <div
                      key={category.id}
                      id={`category-section-${category.id}`}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-card overflow-hidden transition-all duration-300"
                    >
                      {/* Category Header */}
                      <div className="p-4 sm:p-5 bg-ivory-50/70 border-b border-beige flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-serif text-base font-bold text-charcoal tracking-wide">
                            {category.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-charcoal-400 bg-white px-2 py-0.5 rounded-full border border-beige-300">
                            {catCompleted} / {catItems.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCategoryModalConfig({
                                isOpen: true,
                                isEditing: true,
                                initialName: category.name,
                                categoryId: category.id,
                              })
                            }
                            className="w-10 h-10 flex items-center justify-center text-charcoal-400 hover:text-charcoal rounded-xl hover:bg-white transition-colors cursor-pointer"
                            aria-label={`Ubah nama kategori ${category.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(category)}
                            className="w-10 h-10 flex items-center justify-center text-charcoal-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                            aria-label={`Hapus kategori ${category.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="divide-y divide-beige">
                        {catItems.length === 0 ? (
                          <div className="p-5 text-center text-xs text-charcoal-400">
                            Belum ada barang di kategori ini.
                          </div>
                        ) : (
                          catItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 sm:p-4 hover:bg-ivory-50/80 transition-colors flex items-center gap-2 sm:gap-3 group"
                            >
                              {/* Clickable Status Indicator - generous 40x40px hit area */}
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

                              {/* Clickable Item Content to Open Edit Modal */}
                              <div
                                onClick={() =>
                                  setItemModalConfig({
                                    isOpen: true,
                                    itemToEdit: item,
                                    defaultCategoryId: category.id,
                                  })
                                }
                                className="flex-1 min-w-0 flex items-center justify-between gap-3 cursor-pointer py-1 -my-1 rounded-lg px-1.5 -mx-1.5 hover:bg-white/60 transition-colors"
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <span
                                    className={`text-sm font-medium leading-snug line-clamp-2 md:truncate ${
                                      item.status === 'completed'
                                        ? 'text-charcoal-400 line-through'
                                        : 'text-charcoal'
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                  {item.notes && (
                                    <span className="text-[11px] text-charcoal-400 block line-clamp-1 md:truncate mt-0.5">
                                      {item.notes}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                                  <div className="hidden sm:block">
                                    {getStatusBadge(item.status)}
                                  </div>

                                  <div className="flex flex-col items-end shrink-0">
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
                          ))
                        )}
                      </div>

                      {/* Add Item to this Category */}
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

                {/* Uncategorized Items Section if any */}
                {categorizedItems.uncategorized.length > 0 && (
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
                      {categorizedItems.uncategorized.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 sm:p-4 hover:bg-ivory-50/80 transition-colors flex items-center gap-2 sm:gap-3 group"
                        >
                          {/* Clickable Status Indicator - generous 40x40px hit area */}
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

                          {/* Clickable Item Content to Open Edit Modal */}
                          <div
                            onClick={() =>
                              setItemModalConfig({
                                isOpen: true,
                                itemToEdit: item,
                                defaultCategoryId: null,
                              })
                            }
                            className="flex-1 min-w-0 flex items-center justify-between gap-3 cursor-pointer py-1 -my-1 rounded-lg px-1.5 -mx-1.5 hover:bg-white/60 transition-colors"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <span
                                className={`text-sm font-medium leading-snug line-clamp-2 md:truncate ${
                                  item.status === 'completed'
                                    ? 'text-charcoal-400 line-through'
                                    : 'text-charcoal'
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.notes && (
                                <span className="text-[11px] text-charcoal-400 block line-clamp-1 md:truncate mt-0.5">
                                  {item.notes}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                              <div className="hidden sm:block">
                                {getStatusBadge(item.status)}
                              </div>

                              <div className="flex flex-col items-end shrink-0">
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Global Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryModalConfig({ isOpen: true, isEditing: false, initialName: '' })
                    }
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-beige-300 hover:bg-white text-charcoal text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <FolderPlus className="w-4 h-4 text-charcoal-500" />
                    <span>Tambah Kategori Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setItemModalConfig({ isOpen: true, itemToEdit: null, defaultCategoryId: null })
                    }
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Barang Seserahan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

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
        onClose={() =>
          setItemModalConfig({ isOpen: false, itemToEdit: null, defaultCategoryId: null })
        }
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      {/* Delete Category Confirmation Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-6 space-y-4 animate-scaleUp"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-charcoal">
                  Hapus Kategori "{deletingCategory.name}"?
                </h4>
                <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                  Barang di dalam kategori ini tidak akan dihapus, melainkan akan dipindahkan ke bagian "Tanpa Kategori".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-500 hover:text-charcoal hover:bg-beige-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(deletingCategory.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Hapus Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          data-testid="category-deletion-toast"
          className="fixed bottom-20 md:bottom-8 right-4 left-4 sm:left-auto sm:right-8 z-50 max-w-md bg-white border border-beige-400 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-slideUp"
        >
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0 mt-0.5">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-charcoal">{toast.title}</h4>
            <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-charcoal-400 hover:text-charcoal rounded-lg cursor-pointer transition-colors"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentModule={currentModule}
        onNavigate={(mod) => onNavigateModule?.(mod)}
      />
    </div>
  );
};
