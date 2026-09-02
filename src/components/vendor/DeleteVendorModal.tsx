import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Vendor } from '../../types/vendor';

interface DeleteVendorModalProps {
  isOpen: boolean;
  vendor: Vendor | null;
  onClose: () => void;
  onConfirmDelete: (vendorId: string) => void;
}

export const DeleteVendorModal: React.FC<DeleteVendorModalProps> = ({
  isOpen,
  vendor,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !vendor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-vendor-title"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 id="delete-vendor-title" className="font-serif text-lg font-bold text-charcoal">
              Hapus Vendor ini?
            </h3>
            <p className="text-xs text-charcoal-400 leading-relaxed">
              Vendor <strong className="text-charcoal">{vendor.name}</strong> akan dihapus dari workspace.
              Tugas-tugas terkait tetap tersimpan secara aman di checklist.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmDelete(vendor.id);
                onClose();
              }}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Hapus Vendor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
