import React, { useState, useMemo, useCallback } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import { PageHeader } from '../ui/PageHeader';
import { VendorSummaryCards } from './VendorSummaryCards';
import { VendorCard } from './VendorCard';
import { VendorModal } from './VendorModal';
import { VendorDetailDrawer } from './VendorDetailDrawer';
import { DeleteVendorModal } from './DeleteVendorModal';
import { GuidedEmptyState } from '../common/GuidedEmptyState';

import { Vendor, VendorStatus } from '../../types/vendor';
import { TaskItem } from '../../types/checklist';
import { CategoryId } from '../../types/onboarding';
import { WorkspaceViewModel } from '../../types/workspace';
import { CATEGORY_TAXONOMY, CATEGORY_ORDER } from '../../domain/categories';
import { ALL_VENDOR_STATUSES, VENDOR_STATUS_LABELS } from '../../domain/vendors';
import {
  createVendor,
  updateVendor,
  deleteVendor,
  filterVendors,
  getVendorSummary,
  getTasksByVendor,
} from '../../utils/vendorUtils';

export interface VendorPageProps {
  workspace: WorkspaceViewModel;
  vendors: Vendor[];
  tasks: TaskItem[];
  initialCategoryFilter?: CategoryId | 'all';
  onVendorChange: (updatedVendors: Vendor[]) => void;
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

export const VendorPage: React.FC<VendorPageProps> = ({
  workspace,
  vendors,
  tasks,
  initialCategoryFilter = 'all',
  onVendorChange,
  onTaskChange,
  currentModule,
  onNavigateModule,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>(initialCategoryFilter);

  // Sync categoryFilter when initialCategoryFilter prop updates
  React.useEffect(() => {
    setCategoryFilter(initialCategoryFilter);
  }, [initialCategoryFilter]);

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  // Derived Summary & Filtering
  const summary = useMemo(() => getVendorSummary(vendors), [vendors]);
  const filteredVendors = useMemo(
    () => filterVendors(vendors, searchQuery, statusFilter, categoryFilter),
    [vendors, searchQuery, statusFilter, categoryFilter]
  );

  // Handlers
  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveVendor = (vendorData: {
    name: string;
    category: CategoryId;
    status: VendorStatus;
    quotedPrice: number | null;
    contactName: string | null;
    phone: string | null;
    instagram: string | null;
    notes: string | null;
  }) => {
    if (modalMode === 'create') {
      const { updatedVendors } = createVendor(vendors, vendorData);
      onVendorChange(updatedVendors);
    } else if (modalMode === 'edit' && editingVendor) {
      const updatedVendors = updateVendor(vendors, editingVendor.id, vendorData);
      onVendorChange(updatedVendors);
      if (detailVendor?.id === editingVendor.id) {
        setDetailVendor(updatedVendors.find((v) => v.id === editingVendor.id) || null);
      }
    }

    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const handleConfirmDeleteVendor = (vendorId: string) => {
    const { updatedVendors, updatedTasks } = deleteVendor(vendors, vendorId, tasks);
    onVendorChange(updatedVendors);
    if (updatedTasks) {
      onTaskChange(updatedTasks);
    }
    if (detailVendor?.id === vendorId) {
      setDetailVendor(null);
    }
    setVendorToDelete(null);
  };

  const handleLinkTaskToVendor = useCallback(
    (taskId: string, vendorId: string | null) => {
      const updatedTasks = tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            vendorId,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });
      onTaskChange(updatedTasks);
    },
    [tasks, onTaskChange]
  );

  const handleToggleTaskComplete = useCallback(
    (taskId: string) => {
      const updatedTasks: TaskItem[] = tasks.map((t) => {
        if (t.id === taskId) {
          const nextStatus: TaskItem['status'] = t.status === 'completed' ? 'todo' : 'completed';
          return {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });
      onTaskChange(updatedTasks);
    },
    [tasks, onTaskChange]
  );

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  // Derived tasks for detail drawer
  const detailRelatedTasks = useMemo(
    () => (detailVendor ? getTasksByVendor(tasks, detailVendor.id) : []),
    [tasks, detailVendor]
  );

  // Derived unlinked tasks available to connect to vendor
  const availableUnlinkedTasks = useMemo(
    () => tasks.filter((t) => !t.vendorId),
    [tasks]
  );

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate}
        workspaceId={workspace.id}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Navigation */}
        <MobileModuleHeader
          title="Vendor"
          icon={<Layers className="w-4 h-4 text-burgundy" />}
          onBack={() => onNavigateModule('dashboard')}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-7">
          {/* Header Section */}
          <PageHeader
            eyebrow="VENDOR PERNIKAHAN"
            title="Vendor"
            description="Kelola vendor dan pilihanmu untuk Hari-H."
            action={
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer shrink-0 min-h-touch"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Vendor</span>
              </button>
            }
          />

          {/* Compact Summary Cards */}
          <VendorSummaryCards summary={summary} />

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-beige shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari vendor..."
                  className="w-full pl-10 pr-4 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-burgundy transition-all"
                />
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 bg-ivory-50 border border-beige-300 rounded-xl px-3 py-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-burgundy shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryId | 'all')}
                  className="bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  {CATEGORY_ORDER.map((catId) => (
                    <option key={catId} value={catId}>
                      {CATEGORY_TAXONOMY[catId].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Status Filter Dropdown (Compact) */}
            <div className="flex md:hidden items-center gap-2 pt-1 border-t border-beige">
              <div className="flex-1 min-w-0 bg-ivory-50 border border-beige-300 rounded-xl px-3 py-2 text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as VendorStatus | 'all')}
                  className="w-full bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer"
                  aria-label="Filter Status Vendor"
                >
                  <option value="all">Semua Status Vendor</option>
                  {ALL_VENDOR_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {VENDOR_STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="p-2 text-burgundy hover:text-burgundy-700 rounded-xl bg-ivory-50 border border-beige-300 transition-colors shrink-0 cursor-pointer"
                  title="Reset Filter"
                  aria-label="Reset Filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Status Filter Pills */}
            <div className="hidden md:flex flex-wrap items-center gap-1.5 pt-1 border-t border-beige">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-burgundy text-white shadow-2xs'
                    : 'bg-ivory-100 text-charcoal-400 hover:text-charcoal'
                }`}
              >
                Semua
              </button>
              {ALL_VENDOR_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-burgundy text-white shadow-2xs'
                      : 'bg-ivory-100 text-charcoal-400 hover:text-charcoal'
                  }`}
                >
                  {VENDOR_STATUS_LABELS[st]}
                </button>
              ))}

              {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-burgundy hover:text-burgundy-700 font-medium px-2 py-1 transition-colors cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Vendor Cards Grid & Empty States */}
          <div>
            {/* EMPTY STATE 1: Overall zero vendors */}
            {vendors.length === 0 && (
              <GuidedEmptyState
                icon={Layers}
                title="Belum ada vendor"
                description="Mulai kumpulkan vendor yang sedang kamu pertimbangkan."
                supportingText="Bandingkan pilihan untuk Venue & Gedung, Catering, Foto & Video, dan kebutuhan lainnya."
                primaryAction={{
                  label: 'Tambah Vendor',
                  onClick: handleOpenAddModal,
                  icon: Plus,
                }}
                examples={['Venue & Gedung', 'Catering', 'Foto & Video', 'Dekorasi']}
                examplesTitle="Contoh kategori vendor:"
                examplesLayout="chips"
              />
            )}

            {/* EMPTY STATE 2: Filter results zero (vendors exist) */}
            {vendors.length > 0 && filteredVendors.length === 0 && (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-beige shadow-card space-y-3 max-w-md mx-auto my-8">
                <div className="w-12 h-12 rounded-full bg-ivory-200 flex items-center justify-center text-charcoal-400 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                {statusFilter === 'selected' ? (
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-charcoal">
                      Belum ada vendor yang dipilih.
                    </h3>
                    <p className="text-xs text-charcoal-400">
                      Vendor yang kamu pilih akan muncul di sini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-charcoal">
                      Vendor tidak ditemukan
                    </h3>
                    <p className="text-xs text-charcoal-400">
                      Coba kata kunci lain atau ubah filter kategori dan status.
                    </p>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-beige text-charcoal hover:bg-ivory-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-burgundy" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* VENDOR CARDS GRID */}
            {filteredVendors.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredVendors.map((vendor) => {
                  const relatedCount = getTasksByVendor(tasks, vendor.id).length;
                  return (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor}
                      relatedTaskCount={relatedCount}
                      onClick={(v) => setDetailVendor(v)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentModule={currentModule} onNavigate={onNavigateModule} />

      {/* Vendor Detail Drawer */}
      <VendorDetailDrawer
        vendor={detailVendor}
        isOpen={Boolean(detailVendor)}
        relatedTasks={detailRelatedTasks}
        availableTasksToLink={availableUnlinkedTasks}
        onClose={() => setDetailVendor(null)}
        onEdit={(v) => {
          handleOpenEditModal(v);
        }}
        onDeleteRequest={(v) => {
          setVendorToDelete(v);
        }}
        onToggleTaskComplete={handleToggleTaskComplete}
        onLinkTaskToVendor={handleLinkTaskToVendor}
      />

      {/* Reusable Add / Edit Vendor Modal */}
      <VendorModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialVendor={editingVendor}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVendor(null);
        }}
        onSave={handleSaveVendor}
      />

      {/* Delete Vendor Confirmation Modal */}
      <DeleteVendorModal
        isOpen={Boolean(vendorToDelete)}
        vendor={vendorToDelete}
        onClose={() => setVendorToDelete(null)}
        onConfirmDelete={handleConfirmDeleteVendor}
      />
    </div>
  );
};
