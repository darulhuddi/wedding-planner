import React, { useState, useEffect } from 'react';
import { X, Gift, Trash2, AlertTriangle, Calendar, UserCheck } from 'lucide-react';
import {
  SeserahanCategory,
  SeserahanItem,
  SeserahanItemStatus,
  ResponsibleParty,
  RESPONSIBLE_PARTIES,
  RESPONSIBLE_PARTY_LABELS,
} from '../../domain/seserahan/types';
import { getDefaultRecommendedItemDeadline } from '../../domain/seserahan/deadlines';

export interface SeserahanItemModalProps {
  isOpen: boolean;
  itemToEdit?: SeserahanItem | null;
  defaultCategoryId?: string | null;
  categories: SeserahanCategory[];
  weddingDate?: string | null;
  onClose: () => void;
  onSave: (payload: {
    categoryId: string | null;
    name: string;
    status: SeserahanItemStatus;
    estimatedCost: number;
    actualCost: number;
    notes: string | null;
    responsibleParty: ResponsibleParty | null;
    responsiblePartyCustom: string | null;
    dueDate: string | null;
  }) => Promise<void> | void;
  onDelete?: (itemId: string) => Promise<void> | void;
}

export const SeserahanItemModal: React.FC<SeserahanItemModalProps> = ({
  isOpen,
  itemToEdit,
  defaultCategoryId = null,
  categories,
  weddingDate,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId);
  const [status, setStatus] = useState<SeserahanItemStatus>('planned');
  const [estimatedCostStr, setEstimatedCostStr] = useState('0');
  const [actualCostStr, setActualCostStr] = useState('0');
  const [notes, setNotes] = useState('');
  const [responsibleParty, setResponsibleParty] = useState<ResponsibleParty | null>(null);
  const [responsiblePartyCustom, setResponsiblePartyCustom] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const recommendedDeadline = getDefaultRecommendedItemDeadline(weddingDate);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setName(itemToEdit.name);
        setCategoryId(itemToEdit.categoryId);
        setStatus(itemToEdit.status);
        setEstimatedCostStr(String(itemToEdit.estimatedCost || 0));
        setActualCostStr(String(itemToEdit.actualCost || 0));
        setNotes(itemToEdit.notes || '');
        setResponsibleParty(itemToEdit.responsibleParty ?? null);
        setResponsiblePartyCustom(itemToEdit.responsiblePartyCustom || '');
        setDueDate(itemToEdit.dueDate || '');
      } else {
        setName('');
        setCategoryId(defaultCategoryId);
        setStatus('planned');
        setEstimatedCostStr('0');
        setActualCostStr('0');
        setNotes('');
        setResponsibleParty(null);
        setResponsiblePartyCustom('');
        setDueDate(recommendedDeadline || '');
      }
      setError(null);
      setIsSubmitting(false);
      setIsConfirmingDelete(false);
    }
  }, [isOpen, itemToEdit, defaultCategoryId, recommendedDeadline]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama barang seserahan wajib diisi.');
      return;
    }

    if (responsibleParty === 'custom' && !responsiblePartyCustom.trim()) {
      setError('Nama pihak penanggung jawab wajib diisi saat memilih "Lainnya".');
      return;
    }

    const estCost = Number(estimatedCostStr.replace(/\D/g, '')) || 0;
    const actCost = Number(actualCostStr.replace(/\D/g, '')) || 0;

    if (estCost < 0 || actCost < 0) {
      setError('Biaya tidak boleh bernilai negatif.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        categoryId: categoryId || null,
        name: name.trim(),
        status,
        estimatedCost: estCost,
        actualCost: actCost,
        notes: notes.trim() ? notes.trim() : null,
        responsibleParty,
        responsiblePartyCustom: responsibleParty === 'custom' ? responsiblePartyCustom.trim() : null,
        dueDate: dueDate.trim() ? dueDate.trim() : null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToEdit || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(itemToEdit.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedEstimated = estimatedCostStr ? Number(estimatedCostStr.replace(/\D/g, '')).toLocaleString('id-ID') : '0';
  const formattedActual = actualCostStr ? Number(actualCostStr.replace(/\D/g, '')).toLocaleString('id-ID') : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-6 relative my-8 animate-scaleUp max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal p-1.5 rounded-full hover:bg-beige-100 transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h3 id="item-modal-title" className="font-serif text-lg font-bold text-charcoal">
              {itemToEdit ? 'Detail & Edit Barang' : 'Tambah Barang Seserahan'}
            </h3>
            <p className="text-xs text-charcoal-400">
              {itemToEdit
                ? 'Perbarui status persiapan, penanggung jawab, tenggat waktu, atau biaya.'
                : 'Catat barang hantaran yang perlu disiapkan.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        {isConfirmingDelete ? (
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Hapus barang ini?</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Tindakan ini akan menghapus <strong>"{name}"</strong> dari daftar seserahan secara permanen.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-charcoal-600 hover:bg-white border border-rose-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-2xs"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Barang'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Barang */}
            <div>
              <label htmlFor="item-name" className="block text-xs font-semibold text-charcoal mb-1">
                Nama Barang <span className="text-rose-500">*</span>
              </label>
              <input
                id="item-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none"
                placeholder="Contoh: Mukena Sutra, Parfum EDP, Tas Tangan..."
                autoFocus
              />
            </div>

            {/* Kategori & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-category" className="block text-xs font-semibold text-charcoal mb-1">
                  Kategori
                </label>
                <select
                  id="item-category"
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value ? e.target.value : null)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none cursor-pointer"
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="item-status" className="block text-xs font-semibold text-charcoal mb-1">
                  Status Persiapan
                </label>
                <select
                  id="item-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SeserahanItemStatus)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none cursor-pointer"
                >
                  <option value="planned">Belum disiapkan</option>
                  <option value="purchased">Sudah dibeli</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
            </div>

            {/* Penanggung Jawab */}
            <div className="p-3 bg-beige/20 border border-beige-300 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                <UserCheck className="w-3.5 h-3.5 text-burgundy" />
                <span>Penanggung Jawab</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RESPONSIBLE_PARTIES.map((party) => {
                  const isSelected = responsibleParty === party;
                  return (
                    <button
                      key={party}
                      type="button"
                      onClick={() => setResponsibleParty(isSelected ? null : party)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-burgundy text-white border-burgundy shadow-2xs'
                          : 'bg-white text-charcoal-600 border-beige-300 hover:bg-beige-50'
                      }`}
                    >
                      {RESPONSIBLE_PARTY_LABELS[party]}
                    </button>
                  );
                })}
              </div>

              {responsibleParty === 'custom' && (
                <div className="pt-1 animate-fadeIn">
                  <label htmlFor="item-custom-resp" className="block text-[11px] font-medium text-charcoal-600 mb-1">
                    Nama / Keterangan Kustom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="item-custom-resp"
                    type="text"
                    value={responsiblePartyCustom}
                    onChange={(e) => setResponsiblePartyCustom(e.target.value)}
                    placeholder="Contoh: Tante Rina, Kakak Pertama..."
                    className="w-full px-3 py-1.5 bg-white border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-lg text-charcoal text-xs outline-none"
                  />
                </div>
              )}
            </div>

            {/* Tenggat Waktu (Due Date) */}
            <div className="p-3 bg-beige/20 border border-beige-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                  <Calendar className="w-3.5 h-3.5 text-burgundy" />
                  <span>Target Selesai (Due Date)</span>
                </div>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="text-[11px] text-charcoal-400 hover:text-rose-600 underline cursor-pointer"
                  >
                    Hapus Tenggat
                  </button>
                )}
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal text-sm outline-none"
              />
              {recommendedDeadline && (
                <div className="flex items-center justify-between text-[11px] text-charcoal-500 pt-0.5">
                  <span>Rekomendasi (H-14): {recommendedDeadline}</span>
                  {dueDate !== recommendedDeadline && (
                    <button
                      type="button"
                      onClick={() => setDueDate(recommendedDeadline)}
                      className="text-burgundy hover:underline font-medium cursor-pointer"
                    >
                      Gunakan Rekomendasi
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Estimasi & Biaya Aktual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-est-cost" className="block text-xs font-semibold text-charcoal mb-1">
                  Estimasi Biaya (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs font-medium pointer-events-none">
                    Rp
                  </span>
                  <input
                    id="item-est-cost"
                    type="text"
                    inputMode="numeric"
                    value={formattedEstimated}
                    onChange={(e) => setEstimatedCostStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="item-act-cost" className="block text-xs font-semibold text-charcoal mb-1">
                  Biaya Aktual (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs font-medium pointer-events-none">
                    Rp
                  </span>
                  <input
                    id="item-act-cost"
                    type="text"
                    inputMode="numeric"
                    value={formattedActual}
                    onChange={(e) => setActualCostStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label htmlFor="item-notes" className="block text-xs font-semibold text-charcoal mb-1">
                Catatan / Spesifikasi Barang (Opsional)
              </label>
              <textarea
                id="item-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal text-xs transition-all outline-none resize-none"
                placeholder="Ukuran sepatu 38, warna sage green, kotak akrilik pita gold..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-beige">
              {itemToEdit && onDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Barang</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-beige-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-burgundy hover:bg-burgundy-700 text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : itemToEdit ? 'Simpan Perubahan' : 'Tambah Barang'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
