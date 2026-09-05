import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import { PageHeader } from '../ui/PageHeader';
import { GuestSummaryCards } from './GuestSummaryCards';
import { GuestRow } from './GuestRow';
import { GuestCard } from './GuestCard';
import { GuestModal } from './GuestModal';
import { GuestDetailDrawer } from './GuestDetailDrawer';
import { DeleteGuestModal } from './DeleteGuestModal';
import { GuidedEmptyState } from '../common/GuidedEmptyState';

import {
  Guest,
  GuestSide,
  GuestInvitationStatus,
  GuestRsvpStatus,
} from '../../types/guest';
import { WorkspaceViewModel } from '../../types/workspace';
import {
  GUEST_SIDE_LABELS,
  GUEST_INVITATION_LABELS,
  GUEST_RSVP_LABELS,
  ALL_GUEST_SIDES,
  ALL_GUEST_INVITATION_STATUSES,
  ALL_GUEST_RSVP_STATUSES,
} from '../../domain/guests';
import {
  createGuest,
  updateGuest,
  deleteGuest,
  filterGuests,
  getGuestSummary,
} from '../../utils/guestUtils';

export interface GuestPageProps {
  workspace: WorkspaceViewModel;
  guests: Guest[];
  onGuestChange: (updatedGuests: Guest[]) => void;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

export const GuestPage: React.FC<GuestPageProps> = ({
  workspace,
  guests,
  onGuestChange,
  currentModule,
  onNavigateModule,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState<GuestSide | 'all'>('all');
  const [rsvpFilter, setRsvpFilter] = useState<GuestRsvpStatus | 'all'>('all');
  const [invitationFilter, setInvitationFilter] = useState<
    GuestInvitationStatus | 'all'
  >('all');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [detailGuest, setDetailGuest] = useState<Guest | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);

  // Derived Summary & Filtered Guests
  const summary = useMemo(() => getGuestSummary(guests), [guests]);
  const filteredGuests = useMemo(
    () =>
      filterGuests(
        guests,
        searchQuery,
        sideFilter,
        rsvpFilter,
        invitationFilter
      ),
    [guests, searchQuery, sideFilter, rsvpFilter, invitationFilter]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    sideFilter !== 'all' ||
    rsvpFilter !== 'all' ||
    invitationFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSideFilter('all');
    setRsvpFilter('all');
    setInvitationFilter('all');
  };

  // Handlers
  const handleOpenAddModal = () => {
    setEditingGuest(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveGuest = (guestData: {
    name: string;
    side: GuestSide;
    pax: number;
    invitationStatus: GuestInvitationStatus;
    rsvpStatus: GuestRsvpStatus;
    phone: string | null;
    notes: string | null;
  }) => {
    if (modalMode === 'create') {
      const { updatedGuests } = createGuest(guests, guestData);
      onGuestChange(updatedGuests);
    } else if (modalMode === 'edit' && editingGuest) {
      const updatedGuests = updateGuest(guests, editingGuest.id, guestData);
      onGuestChange(updatedGuests);
      if (detailGuest?.id === editingGuest.id) {
        setDetailGuest(
          updatedGuests.find((g) => g.id === editingGuest.id) || null
        );
      }
    }

    setIsModalOpen(false);
    setEditingGuest(null);
  };

  const handleConfirmDeleteGuest = (guestId: string) => {
    const { updatedGuests } = deleteGuest(guests, guestId);
    onGuestChange(updatedGuests);
    if (detailGuest?.id === guestId) {
      setDetailGuest(null);
    }
    setGuestToDelete(null);
  };

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
          title="Tamu"
          icon={<Users className="w-4 h-4 text-burgundy" />}
          onBack={() => onNavigateModule('dashboard')}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-7">
          {/* Header Section */}
          <PageHeader
            eyebrow="DAFTAR TAMU"
            title="Tamu Undangan"
            description="Kelola daftar tamu, pihak keluarga, dan status konfirmasi kehadiran (RSVP)."
            action={
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer shrink-0 min-h-touch"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tamu</span>
              </button>
            }
          />

          {/* Compact Summary Cards */}
          <GuestSummaryCards summary={summary} />

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-beige shadow-xs space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full min-w-0">
                <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama tamu..."
                  className="w-full pl-10 pr-4 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-burgundy transition-all"
                />
              </div>

              {/* Mobile Filter Toggle Button */}
              <div className="flex md:hidden items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer min-h-touch ${
                    hasActiveFilters
                      ? 'bg-burgundy-50 border-burgundy-200 text-burgundy'
                      : 'bg-ivory-50 border-beige-300 text-charcoal'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter {hasActiveFilters && '(Aktif)'}</span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs text-burgundy hover:text-burgundy-700 font-medium px-2 py-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Desktop Filters Row */}
              <div className="hidden md:flex flex-wrap items-center gap-2">
                {/* Side Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-ivory-50 border border-beige-300 rounded-xl px-3 py-2 text-xs">
                  <span className="text-charcoal-400 font-normal">Pihak:</span>
                  <select
                    value={sideFilter}
                    onChange={(e) =>
                      setSideFilter(e.target.value as GuestSide | 'all')
                    }
                    className="bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer"
                  >
                    <option value="all">Semua</option>
                    {ALL_GUEST_SIDES.map((s) => (
                      <option key={s} value={s}>
                        {GUEST_SIDE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* RSVP Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-ivory-50 border border-beige-300 rounded-xl px-3 py-2 text-xs">
                  <span className="text-charcoal-400 font-normal">RSVP:</span>
                  <select
                    value={rsvpFilter}
                    onChange={(e) =>
                      setRsvpFilter(e.target.value as GuestRsvpStatus | 'all')
                    }
                    className="bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer"
                  >
                    <option value="all">Semua</option>
                    {ALL_GUEST_RSVP_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {GUEST_RSVP_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invitation Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-ivory-50 border border-beige-300 rounded-xl px-3 py-2 text-xs">
                  <span className="text-charcoal-400 font-normal">Undangan:</span>
                  <select
                    value={invitationFilter}
                    onChange={(e) =>
                      setInvitationFilter(
                        e.target.value as GuestInvitationStatus | 'all'
                      )
                    }
                    className="bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer"
                  >
                    <option value="all">Semua</option>
                    {ALL_GUEST_INVITATION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {GUEST_INVITATION_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs text-burgundy hover:text-burgundy-700 font-medium px-2 py-1 transition-colors cursor-pointer ml-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Filter Drawer / Collapsible Box */}
            {isMobileFilterOpen && (
              <div className="md:hidden pt-3 border-t border-beige space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-500 mb-1">
                      Pihak
                    </label>
                    <select
                      value={sideFilter}
                      onChange={(e) =>
                        setSideFilter(e.target.value as GuestSide | 'all')
                      }
                      className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs font-medium text-charcoal"
                    >
                      <option value="all">Semua</option>
                      {ALL_GUEST_SIDES.map((s) => (
                        <option key={s} value={s}>
                          {GUEST_SIDE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-500 mb-1">
                      Status Kehadiran (RSVP)
                    </label>
                    <select
                      value={rsvpFilter}
                      onChange={(e) =>
                        setRsvpFilter(e.target.value as GuestRsvpStatus | 'all')
                      }
                      className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs font-medium text-charcoal"
                    >
                      <option value="all">Semua</option>
                      {ALL_GUEST_RSVP_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {GUEST_RSVP_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-500 mb-1">
                      Status Undangan
                    </label>
                    <select
                      value={invitationFilter}
                      onChange={(e) =>
                        setInvitationFilter(
                          e.target.value as GuestInvitationStatus | 'all'
                        )
                      }
                      className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs font-medium text-charcoal"
                    >
                      <option value="all">Semua</option>
                      {ALL_GUEST_INVITATION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {GUEST_INVITATION_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Guest Lists & Empty States */}
          <div>
            {/* EMPTY STATE 1: Overall zero guests */}
            {guests.length === 0 && (
              <GuidedEmptyState
                icon={Users}
                title="Belum ada tamu"
                description="Mulai tambahkan keluarga dan teman yang ingin kamu undang."
                supportingText="Kamu bisa membagi tamu berdasarkan pihak pria, pihak wanita, atau bersama."
                primaryAction={{
                  label: 'Tambah Tamu',
                  onClick: handleOpenAddModal,
                  icon: Plus,
                }}
                examples={['Keluarga', 'Teman', 'Rekan kerja']}
                examplesTitle="Contoh kelompok tamu:"
                examplesLayout="chips"
              />
            )}

            {/* EMPTY STATE 2: Filter results zero (guests exist) */}
            {guests.length > 0 && filteredGuests.length === 0 && (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-beige shadow-card space-y-3 max-w-md mx-auto my-8">
                <div className="w-12 h-12 rounded-full bg-ivory-200 flex items-center justify-center text-charcoal-400 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    Tamu tidak ditemukan
                  </h3>
                  <p className="text-xs text-charcoal-400">
                    Coba ubah kata pencarian atau filter.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-beige text-charcoal hover:bg-ivory-100 transition-colors cursor-pointer min-h-touch"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-burgundy" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* GUEST LIST VIEWS */}
            {filteredGuests.length > 0 && (
              <>
                {/* 1. Desktop Operational Table View */}
                <div className="hidden md:block bg-white rounded-2xl border border-beige shadow-xs overflow-x-auto max-w-full">
                  <table className="w-full min-w-[760px] text-left border-collapse">
                    <thead>
                      <tr className="bg-ivory-50 border-b border-beige text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                        <th className="py-3 px-4 min-w-[160px]">Nama</th>
                        <th className="py-3 px-4 min-w-[115px] w-[115px]">Pihak</th>
                        <th className="py-3 px-4 min-w-[120px] w-[120px]">Jumlah Orang</th>
                        <th className="py-3 px-4 min-w-[130px] w-[130px]">Undangan</th>
                        <th className="py-3 px-4 min-w-[135px] w-[135px]">RSVP</th>
                        <th className="py-3 px-4 min-w-[95px] w-[95px] text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest) => (
                        <GuestRow
                          key={guest.id}
                          guest={guest}
                          onClick={(g) => setDetailGuest(g)}
                          onEdit={(g) => handleOpenEditModal(g)}
                          onDelete={(g) => setGuestToDelete(g)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Compact Vertical Cards */}
                <div className="md:hidden space-y-2.5">
                  {filteredGuests.map((guest) => (
                    <GuestCard
                      key={guest.id}
                      guest={guest}
                      onClick={(g) => setDetailGuest(g)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentModule={currentModule}
        onNavigate={onNavigateModule}
      />

      {/* Guest Detail Drawer */}
      <GuestDetailDrawer
        guest={detailGuest}
        isOpen={Boolean(detailGuest)}
        onClose={() => setDetailGuest(null)}
        onEdit={(g) => {
          handleOpenEditModal(g);
        }}
        onDeleteRequest={(g) => {
          setGuestToDelete(g);
        }}
      />

      {/* Reusable Add / Edit Guest Modal */}
      <GuestModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialGuest={editingGuest}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGuest(null);
        }}
        onSave={handleSaveGuest}
      />

      {/* Delete Guest Confirmation Modal */}
      <DeleteGuestModal
        isOpen={Boolean(guestToDelete)}
        guest={guestToDelete}
        onClose={() => setGuestToDelete(null)}
        onConfirmDelete={handleConfirmDeleteGuest}
      />
    </div>
  );
};
