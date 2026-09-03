import React, { useState, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { NoteCard } from './NoteCard';
import { NoteModal } from './NoteModal';
import { NoteDetailDrawer } from './NoteDetailDrawer';
import { DeleteNoteModal } from './DeleteNoteModal';
import { GuidedEmptyState } from '../common/GuidedEmptyState';

import { Note, NoteCategory } from '../../types/note';
import { WorkspaceViewModel } from '../../types/workspace';
import { ALL_NOTE_CATEGORIES, NOTE_CATEGORY_LABELS } from '../../domain/notes';
import {
  createNote,
  updateNote,
  deleteNote,
  togglePinNote,
  filterNotes,
  sortNotes,
} from '../../utils/noteUtils';

export interface NotePageProps {
  workspace: WorkspaceViewModel;
  notes: Note[];
  onNoteChange: (updatedNotes: Note[]) => void;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

export const NotePage: React.FC<NotePageProps> = ({
  workspace,
  notes,
  onNoteChange,
  currentModule,
  onNavigateModule,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'all'>('all');

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [detailNote, setDetailNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Derived Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    const filtered = filterNotes(notes, searchQuery, categoryFilter);
    return sortNotes(filtered);
  }, [notes, searchQuery, categoryFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'all';

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
  }, []);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingNote(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: Note) => {
    setEditingNote(note);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveNote = (noteData: {
    title: string;
    category: NoteCategory;
    content: string;
    isPinned?: boolean;
  }) => {
    if (modalMode === 'create') {
      const { updatedNotes } = createNote(notes, noteData);
      onNoteChange(updatedNotes);
    } else if (modalMode === 'edit' && editingNote) {
      const updatedNotes = updateNote(notes, editingNote.id, noteData);
      onNoteChange(updatedNotes);
      if (detailNote?.id === editingNote.id) {
        setDetailNote(updatedNotes.find((n) => n.id === editingNote.id) || null);
      }
    }

    setIsModalOpen(false);
    setEditingNote(null);
  };

  const handleConfirmDeleteNote = (noteId: string) => {
    const { updatedNotes } = deleteNote(notes, noteId);
    onNoteChange(updatedNotes);
    if (detailNote?.id === noteId) {
      setDetailNote(null);
    }
    setNoteToDelete(null);
  };

  const handleTogglePin = (e: React.MouseEvent | null, note: Note) => {
    if (e) e.stopPropagation();
    const updatedNotes = togglePinNote(notes, note.id);
    onNoteChange(updatedNotes);
    if (detailNote?.id === note.id) {
      setDetailNote(updatedNotes.find((n) => n.id === note.id) || null);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Navigation */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-burgundy flex items-center justify-center text-ivory">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg font-bold text-charcoal">
              Catatan
            </span>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-7">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight">
                Catatan
              </h1>
              <p className="text-sm text-charcoal-400 mt-1">
                Simpan ide, keputusan, atau informasi penting di sini.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer shrink-0 min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Catatan</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-beige shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul atau isi catatan..."
                  className="w-full pl-10 pr-4 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-burgundy transition-all placeholder:text-charcoal-300"
                />
              </div>

              {/* Mobile/Compact Category Filter Dropdown */}
              <div className="flex sm:hidden items-center gap-2 bg-ivory-50 border border-beige-300 rounded-xl px-3 py-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-burgundy shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as NoteCategory | 'all')}
                  className="bg-transparent focus:outline-none text-xs font-semibold text-charcoal cursor-pointer w-full"
                >
                  <option value="all">Semua Kategori</option>
                  {ALL_NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {NOTE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Filter Pills (Desktop & Tablet) */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5 pt-1 border-t border-beige">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-burgundy text-white shadow-2xs'
                    : 'bg-ivory-100 text-charcoal-400 hover:text-charcoal'
                }`}
              >
                Semua
              </button>
              {ALL_NOTE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-burgundy text-white shadow-2xs'
                      : 'bg-ivory-100 text-charcoal-400 hover:text-charcoal'
                  }`}
                >
                  {NOTE_CATEGORY_LABELS[cat]}
                </button>
              ))}

              {hasActiveFilters && (
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

            {/* Mobile Reset Filter button */}
            {hasActiveFilters && (
              <div className="flex sm:hidden justify-end pt-1">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-burgundy hover:text-burgundy-700 font-medium px-2 py-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              </div>
            )}
          </div>

          {/* Notes Grid & Empty States */}
          <div>
            {/* EMPTY STATE 1: Overall zero notes */}
            {notes.length === 0 && (
              <GuidedEmptyState
                icon={BookOpen}
                title="Belum ada catatan"
                description="Simpan hal-hal kecil yang tidak ingin kamu lupakan selama persiapan."
                primaryAction={{
                  label: 'Buat Catatan',
                  onClick: handleOpenAddModal,
                  icon: Plus,
                }}
                examplesTitle="Inspirasi catatan:"
                examples={[
                  'Catatan meeting dengan fotografer',
                  'Referensi dekorasi & palet warna',
                  'Hal yang perlu dibicarakan dengan keluarga',
                ]}
                examplesLayout="cards"
              />
            )}

            {/* EMPTY STATE 2: Filter results zero (notes exist) */}
            {notes.length > 0 && filteredNotes.length === 0 && (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-beige shadow-card space-y-3 max-w-md mx-auto my-8">
                <div className="w-12 h-12 rounded-full bg-ivory-200 flex items-center justify-center text-charcoal-400 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    Catatan tidak ditemukan
                  </h3>
                  <p className="text-xs text-charcoal-400">
                    Coba gunakan kata pencarian atau kategori lain.
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

            {/* NOTES CARDS GRID */}
            {filteredNotes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onClick={(n) => setDetailNote(n)}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentModule={currentModule} onNavigate={onNavigateModule} />

      {/* Note Detail Drawer */}
      <NoteDetailDrawer
        note={detailNote}
        isOpen={Boolean(detailNote)}
        onClose={() => setDetailNote(null)}
        onEdit={(n) => {
          handleOpenEditModal(n);
        }}
        onDeleteRequest={(n) => {
          setNoteToDelete(n);
        }}
        onTogglePin={(n) => handleTogglePin(null, n)}
      />

      {/* Reusable Add / Edit Note Modal */}
      <NoteModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialNote={editingNote}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
      />

      {/* Delete Note Confirmation Modal */}
      <DeleteNoteModal
        isOpen={Boolean(noteToDelete)}
        note={noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirmDelete={handleConfirmDeleteNote}
      />
    </div>
  );
};
