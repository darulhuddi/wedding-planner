import React, { useState } from 'react';
import { WorkspaceViewModel } from '../../types/workspace';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { useMoodboard } from '../../hooks/useMoodboard';
import { MoodboardHeader } from './MoodboardHeader';
import { MoodboardCategoryNav } from './MoodboardCategoryNav';
import { MoodboardCard } from './MoodboardCard';
import { MoodboardDetailPanel } from './MoodboardDetailPanel';
import { AddEditInspirationModal } from './AddEditInspirationModal';
import { MoodboardEmptyState } from './MoodboardEmptyState';
import { MoodboardItem } from '../../domain/moodboard/types';
import { Loader2, AlertCircle } from 'lucide-react';

export interface MoodboardPageProps {
  workspace: WorkspaceViewModel;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

export const MoodboardPage: React.FC<MoodboardPageProps> = ({
  workspace,
  currentModule,
  onNavigateModule,
}) => {
  const {
    items,
    filteredItems,
    selectedCategory,
    searchQuery,
    sortOrder,
    selectedItem,
    isAddModalOpen,
    editingItem,
    isLoading,
    error,
    setSelectedCategory,
    setSearchQuery,
    setSortOrder,
    setSelectedItemId,
    setIsAddModalOpen,
    setEditingItem,
    addItem,
    addGoogleDriveItems,
    updateItem,
    toggleFavorite,
    deleteItem,
  } = useMoodboard(workspace.id);

  const [deletingItem, setDeletingItem] = useState<MoodboardItem | null>(null);
  const [categoryOnlyMode, setCategoryOnlyMode] = useState<boolean>(false);

  // Handle Edit Action
  const handleOpenEdit = (item: MoodboardItem) => {
    setCategoryOnlyMode(false);
    setEditingItem(item);
  };

  // Handle Change Category Action
  const handleOpenChangeCategory = (item: MoodboardItem) => {
    setCategoryOnlyMode(true);
    setEditingItem(item);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteItem(deletingItem.id);
      setDeletingItem(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex selection:bg-burgundy-100 selection:text-burgundy-900">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate || undefined}
        workspaceId={workspace.id}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Top Header */}
          <MoodboardHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddClick={() => {
              setCategoryOnlyMode(false);
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
          />

          {/* Category Filter & Sort Control */}
          <MoodboardCategoryNav
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
          />

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm p-3.5 rounded-2xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-burgundy animate-spin" />
              <p className="text-xs text-charcoal-400 font-medium">Memuat inspirasi Moodboard...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty State */
            <MoodboardEmptyState
              isFiltered={items.length > 0 || searchQuery.trim() !== '' || selectedCategory !== 'all'}
              onAddClick={() => {
                setCategoryOnlyMode(false);
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
            />
          ) : (
            /* Gallery Layout Grid + Right Side Detail Panel */
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Gallery Grid */}
              <div
                className={`w-full flex-1 grid gap-3 sm:gap-4 transition-all duration-200 ${
                  selectedItem
                    ? 'grid-cols-2 sm:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
                }`}
              >
                {filteredItems.map((item) => (
                  <MoodboardCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onSelect={(selected) => {
                      if (selectedItem?.id === selected.id) {
                        setSelectedItemId(null);
                      } else {
                        setSelectedItemId(selected.id);
                      }
                    }}
                    onToggleFavorite={(_id, e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    onEdit={(target, e) => {
                      e.stopPropagation();
                      handleOpenEdit(target);
                    }}
                    onDelete={(target, e) => {
                      e.stopPropagation();
                      setDeletingItem(target);
                    }}
                  />
                ))}
              </div>

              {/* Detail Panel */}
              <MoodboardDetailPanel
                item={selectedItem}
                onClose={() => setSelectedItemId(null)}
                onEdit={handleOpenEdit}
                onDelete={(target) => setDeletingItem(target)}
                onChangeCategory={handleOpenChangeCategory}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentModule={currentModule} onNavigate={onNavigateModule} />

      {/* Add / Edit Inspiration Modal */}
      <AddEditInspirationModal
        isOpen={isAddModalOpen || Boolean(editingItem)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
          setCategoryOnlyMode(false);
        }}
        initialData={editingItem}
        categoryOnlyMode={categoryOnlyMode}
        onSave={async (input, file) => {
          if (editingItem) {
            await updateItem(editingItem.id, input);
          } else {
            await addItem(input, file);
          }
        }}
        onSaveGoogleDrive={async (driveFiles, category, details) => {
          await addGoogleDriveItems(driveFiles, category, details);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs"
            onClick={() => setDeletingItem(null)}
          />
          <div className="relative bg-white rounded-3xl border border-beige-300 shadow-2xl w-full max-w-sm p-6 text-center z-50 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-charcoal">Hapus Inspirasi Ini?</h3>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Inspirasi &ldquo;{deletingItem.title || 'Inspirasi'}&rdquo; akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-white border border-beige-300 hover:bg-ivory-100 text-charcoal text-xs font-semibold rounded-xl cursor-pointer min-h-touch"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl cursor-pointer min-h-touch shadow-2xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
