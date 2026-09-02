import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Vendor, VendorStatus } from '../../types/vendor';
import { CategoryId } from '../../types/onboarding';
import { CATEGORY_TAXONOMY, CATEGORY_ORDER } from '../../domain/categories';
import { VENDOR_STATUS_LABELS, ALL_VENDOR_STATUSES } from '../../domain/vendors';
import { parseRupiahInput } from '../../utils/onboardingUtils';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

export interface VendorModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialVendor?: Vendor | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: CategoryId;
    status: VendorStatus;
    quotedPrice: number | null;
    contactName: string | null;
    phone: string | null;
    instagram: string | null;
    notes: string | null;
  }) => void;
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  mode,
  initialVendor,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('venue');
  const [status, setStatus] = useState<VendorStatus>('considering');
  const [quotedPriceInput, setQuotedPriceInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && mode === 'edit' && initialVendor) {
      setName(initialVendor.name || '');
      setCategory(initialVendor.category || 'venue');
      setStatus(initialVendor.status || 'considering');
      setQuotedPriceInput(
        initialVendor.quotedPrice !== null && initialVendor.quotedPrice !== undefined
          ? initialVendor.quotedPrice.toString()
          : ''
      );
      setContactName(initialVendor.contactName || '');
      setPhone(initialVendor.phone || '');
      setInstagram(initialVendor.instagram || '');
      setNotes(initialVendor.notes || '');
    } else if (isOpen && mode === 'create') {
      setName('');
      setCategory('venue');
      setStatus('considering');
      setQuotedPriceInput('');
      setContactName('');
      setPhone('');
      setInstagram('');
      setNotes('');
    }
  }, [isOpen, mode, initialVendor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) return;

    let parsedPrice: number | null = null;
    if (quotedPriceInput.trim() !== '') {
      const p = parseRupiahInput(quotedPriceInput);
      if (!isNaN(p) && p >= 0) {
        parsedPrice = p;
      }
    }

    onSave({
      name: name.trim(),
      category,
      status,
      quotedPrice: parsedPrice,
      contactName: contactName.trim() || null,
      phone: phone.trim() || null,
      instagram: instagram.trim() || null,
      notes: notes.trim() || null,
    });

    onClose();
  };

  const isFormValid = Boolean(name.trim() && category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-modal-title"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-beige">
          <h2 id="vendor-modal-title" className="font-serif text-xl font-bold text-charcoal">
            {mode === 'create' ? 'Tambah Vendor' : 'Edit Vendor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Vendor Name (Required) */}
          <div>
            <label htmlFor="vendor-name" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Nama Vendor <span className="text-burgundy">*</span>
            </label>
            <input
              id="vendor-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Sanggar Kirana MUA"
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all"
            />
          </div>

          {/* Category & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category (Required) */}
            <div>
              <label htmlFor="vendor-category" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Kategori <span className="text-burgundy">*</span>
              </label>
              <select
                id="vendor-category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId)}
                className="w-full px-3 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all cursor-pointer"
              >
                {CATEGORY_ORDER.map((catId) => (
                  <option key={catId} value={catId}>
                    {CATEGORY_TAXONOMY[catId].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status (Optional, Default 'considering') */}
            <div>
              <label htmlFor="vendor-status" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Status Keputusan
              </label>
              <select
                id="vendor-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatus)}
                className="w-full px-3 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all cursor-pointer"
              >
                {ALL_VENDOR_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {VENDOR_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quoted Price (Optional) */}
          <div>
            <label htmlFor="vendor-quoted-price" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Harga Penawaran <span className="font-normal text-charcoal-300">(Opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 font-medium text-sm">
                Rp
              </span>
              <input
                id="vendor-quoted-price"
                type="text"
                inputMode="numeric"
                value={quotedPriceInput}
                onChange={(e) => {
                  // Only allow digits or empty string
                  const val = e.target.value.replace(/\D/g, '');
                  setQuotedPriceInput(val);
                }}
                placeholder="Contoh: 15000000"
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all"
              />
            </div>
            {quotedPriceInput && !isNaN(parseInt(quotedPriceInput, 10)) && (
              <p className="text-[11px] text-charcoal-400 mt-1">
                Preview: {formatRupiahNumber(parseInt(quotedPriceInput, 10))}
              </p>
            )}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="vendor-contact-name" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Nama Kontak
              </label>
              <input
                id="vendor-contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contoh: Mbak Rina"
                className="w-full px-3 py-2 text-sm bg-white border border-beige-300 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
              />
            </div>

            <div>
              <label htmlFor="vendor-phone" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                No. Telepon / WA
              </label>
              <input
                id="vendor-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 text-sm bg-white border border-beige-300 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
              />
            </div>

            <div>
              <label htmlFor="vendor-instagram" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Instagram
              </label>
              <input
                id="vendor-instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@vendorname"
                className="w-full px-3 py-2 text-sm bg-white border border-beige-300 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="vendor-notes" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Catatan Pilihan
            </label>
            <textarea
              id="vendor-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan kelebihan, paket yang ditawarkan, atau alasan pertimbangan..."
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all resize-none"
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 flex justify-end gap-3 border-t border-beige">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-burgundy hover:bg-burgundy-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {mode === 'create' ? 'Simpan Vendor' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
