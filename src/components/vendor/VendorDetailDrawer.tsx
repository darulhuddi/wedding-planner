import React from 'react';
import {
  X,
  Edit3,
  Trash2,
  Tag,
  User,
  Phone,
  FileText,
  CheckSquare,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { Vendor } from '../../types/vendor';
import { TaskItem } from '../../types/checklist';
import { CATEGORY_LABELS } from '../../domain/categories';
import { VENDOR_STATUS_LABELS } from '../../domain/vendors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={`${className} fill-none stroke-current`} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export interface VendorDetailDrawerProps {
  vendor: Vendor | null;
  isOpen: boolean;
  relatedTasks: TaskItem[];
  availableTasksToLink?: TaskItem[];
  onClose: () => void;
  onEdit: (vendor: Vendor) => void;
  onDeleteRequest: (vendor: Vendor) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onLinkTaskToVendor?: (taskId: string, vendorId: string | null) => void;
}

export const VendorDetailDrawer: React.FC<VendorDetailDrawerProps> = ({
  vendor,
  isOpen,
  relatedTasks,
  availableTasksToLink = [],
  onClose,
  onEdit,
  onDeleteRequest,
  onToggleTaskComplete,
  onLinkTaskToVendor,
}) => {
  const [isLinkingTask, setIsLinkingTask] = React.useState(false);
  const [selectedTaskToLink, setSelectedTaskToLink] = React.useState('');

  if (!isOpen || !vendor) return null;

  const getStatusBadgeStyle = (status: Vendor['status']) => {
    switch (status) {
      case 'selected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'considering':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'contacted':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'negotiating':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'not_selected':
        return 'bg-charcoal-50 text-charcoal-500 border-beige-300';
      default:
        return 'bg-ivory-200 text-charcoal-500 border-beige';
    }
  };

  const handleConfirmLink = () => {
    if (selectedTaskToLink && onLinkTaskToVendor) {
      onLinkTaskToVendor(selectedTaskToLink, vendor.id);
      setSelectedTaskToLink('');
      setIsLinkingTask(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Desktop slide-over right / Mobile bottom sheet) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 md:pl-0 w-full md:w-auto">
        <div
          className="w-full md:w-[440px] bg-white shadow-2xl flex flex-col justify-between
            transform transition-transform duration-300 ease-in-out
            fixed md:relative bottom-0 left-0 right-0 md:inset-auto
            rounded-t-3xl md:rounded-none max-h-[92vh] md:max-h-full overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-beige flex items-center justify-between bg-ivory-50/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600">
                Detail Vendor
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400
                hover:text-charcoal hover:bg-beige-200/60 transition-colors cursor-pointer"
              aria-label="Tutup detail vendor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {/* TOP SECTION: Name, Category, Status, Quoted Price */}
            <div className="bg-ivory-50/80 p-5 rounded-2xl border border-beige space-y-4">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-2xl font-bold text-charcoal leading-snug flex-1">
                    {vendor.name}
                  </h2>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${getStatusBadgeStyle(
                      vendor.status
                    )}`}
                  >
                    {VENDOR_STATUS_LABELS[vendor.status]}
                  </span>
                </div>

                <p className="text-sm font-medium text-charcoal-400">
                  {CATEGORY_LABELS[vendor.category]}
                </p>
              </div>

              {/* Price Banner */}
              <div className="pt-3 border-t border-beige/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
                  Harga Penawaran
                </span>
                <span className="font-serif text-2xl font-bold text-burgundy block mt-0.5">
                  {vendor.quotedPrice !== null && vendor.quotedPrice > 0
                    ? formatRupiahNumber(vendor.quotedPrice)
                    : 'Belum ada penawaran'}
                </span>
              </div>
            </div>

            {/* INFORMASI KONTAK VENDOR */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                Informasi Vendor
              </h3>
              <div className="bg-white p-4 rounded-xl border border-beige space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-charcoal">
                  <User className="w-4 h-4 text-burgundy shrink-0" />
                  <span className="text-charcoal-400 font-medium">Kontak:</span>
                  <span className="font-semibold">{vendor.contactName || '—'}</span>
                </div>

                <div className="flex items-center gap-2 text-charcoal">
                  <Phone className="w-4 h-4 text-burgundy shrink-0" />
                  <span className="text-charcoal-400 font-medium">Telepon/WA:</span>
                  <span className="font-semibold">{vendor.phone || '—'}</span>
                </div>

                <div className="flex items-center gap-2 text-charcoal">
                  <InstagramIcon className="w-4 h-4 text-burgundy shrink-0" />
                  <span className="text-charcoal-400 font-medium">Instagram:</span>
                  <span className="font-semibold">{vendor.instagram || '—'}</span>
                </div>
              </div>
            </div>

            {/* CATATAN */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-burgundy" /> Catatan
              </h3>
              {vendor.notes ? (
                <p className="text-sm text-charcoal-600 leading-relaxed whitespace-pre-wrap bg-ivory-50/50 p-3.5 rounded-xl border border-beige">
                  {vendor.notes}
                </p>
              ) : (
                <p className="text-xs text-charcoal-300 italic">Belum ada catatan untuk vendor ini.</p>
              )}
            </div>

            {/* TUGAS TERKAIT */}
            <div className="space-y-3 pt-2 border-t border-beige">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-burgundy" /> Tugas Terkait ({relatedTasks.length})
                </h3>
                {onLinkTaskToVendor && availableTasksToLink.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsLinkingTask((prev) => !prev)}
                    className="text-xs text-burgundy hover:text-burgundy-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hubungkan Tugas</span>
                  </button>
                )}
              </div>

              {/* Link Task Input */}
              {isLinkingTask && availableTasksToLink.length > 0 && (
                <div className="bg-ivory-100 p-3 rounded-xl border border-beige space-y-2">
                  <label className="text-xs font-semibold text-charcoal block">
                    Pilih tugas untuk dihubungkan ke vendor ini:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTaskToLink}
                      onChange={(e) => setSelectedTaskToLink(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-beige-300 rounded-lg text-charcoal focus:outline-none focus:ring-1 focus:ring-burgundy"
                    >
                      <option value="">Pilih Tugas...</option>
                      {availableTasksToLink.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({CATEGORY_LABELS[t.category]})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedTaskToLink}
                      onClick={handleConfirmLink}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              )}

              {/* Task list */}
              {relatedTasks.length > 0 ? (
                <div className="space-y-2">
                  {relatedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white p-3 rounded-xl border border-beige flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {onToggleTaskComplete ? (
                          <button
                            type="button"
                            onClick={() => onToggleTaskComplete(t.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              t.status === 'completed'
                                ? 'bg-burgundy border-burgundy text-white'
                                : 'border-charcoal-300 hover:border-burgundy'
                            }`}
                          >
                            {t.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          </button>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-burgundy shrink-0" />
                        )}
                        <span
                          className={`font-medium truncate ${
                            t.status === 'completed' ? 'line-through text-charcoal-400' : 'text-charcoal'
                          }`}
                        >
                          {t.title}
                        </span>
                      </div>

                      {onLinkTaskToVendor && (
                        <button
                          type="button"
                          onClick={() => onLinkTaskToVendor(t.id, null)}
                          className="text-[10px] text-charcoal-400 hover:text-rose-600 font-medium shrink-0 cursor-pointer"
                          title="Lepas relasi tugas"
                        >
                          Lepas
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-charcoal-300 italic bg-ivory-50/50 p-3 rounded-xl border border-beige">
                  Belum ada tugas yang dihubungkan ke vendor ini.
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions: Edit Vendor & Delete Vendor */}
          <div className="p-5 border-t border-beige bg-ivory-50/60 shrink-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onDeleteRequest(vendor);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Vendor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onEdit(vendor);
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Vendor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
