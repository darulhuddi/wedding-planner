import React, { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import {
  Guest,
  GuestSide,
  GuestInvitationStatus,
  GuestRsvpStatus,
} from '../../types/guest';
import {
  GUEST_SIDE_LABELS,
  GUEST_INVITATION_LABELS,
  GUEST_RSVP_LABELS,
  ALL_GUEST_SIDES,
  ALL_GUEST_INVITATION_STATUSES,
  ALL_GUEST_RSVP_STATUSES,
} from '../../domain/guests';
import { validatePax } from '../../utils/guestUtils';

export interface GuestModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialGuest?: Guest | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    side: GuestSide;
    pax: number;
    invitationStatus: GuestInvitationStatus;
    rsvpStatus: GuestRsvpStatus;
    phone: string | null;
    notes: string | null;
  }) => void;
}

export const GuestModal: React.FC<GuestModalProps> = ({
  isOpen,
  mode,
  initialGuest,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [side, setSide] = useState<GuestSide>('shared');
  const [paxInput, setPaxInput] = useState('1');
  const [invitationStatus, setInvitationStatus] =
    useState<GuestInvitationStatus>('not_invited');
  const [rsvpStatus, setRsvpStatus] = useState<GuestRsvpStatus>('pending');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paxError, setPaxError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mode === 'edit' && initialGuest) {
      setName(initialGuest.name || '');
      setSide(initialGuest.side || 'shared');
      setPaxInput((initialGuest.pax ?? 1).toString());
      setInvitationStatus(initialGuest.invitationStatus || 'not_invited');
      setRsvpStatus(initialGuest.rsvpStatus || 'pending');
      setPhone(initialGuest.phone || '');
      setNotes(initialGuest.notes || '');
      setPaxError(null);
    } else if (isOpen && mode === 'create') {
      setName('');
      setSide('shared');
      setPaxInput('1');
      setInvitationStatus('not_invited');
      setRsvpStatus('pending');
      setPhone('');
      setNotes('');
      setPaxError(null);
    }
  }, [isOpen, mode, initialGuest]);

  if (!isOpen) return null;

  const handlePaxChange = (val: string) => {
    // Only accept numeric digits
    const cleaned = val.replace(/\D/g, '');
    setPaxInput(cleaned);
    if (!cleaned) {
      setPaxError('Jumlah orang minimal 1');
    } else {
      const parsed = validatePax(cleaned);
      if (parsed === null || parsed < 1) {
        setPaxError('Jumlah orang harus berupa bilangan bulat positif (minimal 1)');
      } else {
        setPaxError(null);
      }
    }
  };

  const handleIncrementPax = () => {
    const current = validatePax(paxInput) ?? 1;
    const next = current + 1;
    setPaxInput(next.toString());
    setPaxError(null);
  };

  const handleDecrementPax = () => {
    const current = validatePax(paxInput) ?? 1;
    if (current > 1) {
      const next = current - 1;
      setPaxInput(next.toString());
      setPaxError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedPax = validatePax(paxInput);
    if (parsedPax === null || parsedPax < 1) {
      setPaxError('Jumlah orang harus berupa bilangan bulat positif (minimal 1)');
      return;
    }

    onSave({
      name: name.trim(),
      side,
      pax: parsedPax,
      invitationStatus,
      rsvpStatus,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    });

    onClose();
  };

  const parsedPax = validatePax(paxInput);
  const isFormValid = Boolean(name.trim() && parsedPax !== null && parsedPax >= 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-modal-title"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-beige">
          <h2 id="guest-modal-title" className="font-serif text-xl font-bold text-charcoal">
            {mode === 'create' ? 'Tambah Tamu' : 'Edit Tamu'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors cursor-pointer min-h-touch min-w-touch flex items-center justify-center"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Guest Name (Required) */}
          <div>
            <label htmlFor="guest-name" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Nama Tamu <span className="text-burgundy">*</span>
            </label>
            <input
              id="guest-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pak Budi Santoso & Partner"
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all"
            />
          </div>

          {/* Side & Pax Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Side (Required) */}
            <div>
              <label htmlFor="guest-side" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Pihak <span className="text-burgundy">*</span>
              </label>
              <select
                id="guest-side"
                required
                value={side}
                onChange={(e) => setSide(e.target.value as GuestSide)}
                className="w-full px-3 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all cursor-pointer"
              >
                {ALL_GUEST_SIDES.map((s) => (
                  <option key={s} value={s}>
                    {GUEST_SIDE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Jumlah Orang / Pax (Positive integer >= 1) */}
            <div>
              <label htmlFor="guest-pax" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Jumlah Orang
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleDecrementPax}
                  disabled={(validatePax(paxInput) ?? 1) <= 1}
                  className="w-10 h-10 flex items-center justify-center bg-ivory-100 hover:bg-beige-200 disabled:opacity-40 disabled:hover:bg-ivory-100 rounded-l-xl border border-r-0 border-beige-300 text-charcoal transition-colors cursor-pointer"
                  aria-label="Kurangi jumlah orang"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  id="guest-pax"
                  type="text"
                  inputMode="numeric"
                  value={paxInput}
                  onChange={(e) => handlePaxChange(e.target.value)}
                  className="w-full h-10 text-center font-medium text-sm bg-white border-y border-beige-300 text-charcoal focus:outline-none focus:ring-1 focus:ring-burgundy"
                />
                <button
                  type="button"
                  onClick={handleIncrementPax}
                  className="w-10 h-10 flex items-center justify-center bg-ivory-100 hover:bg-beige-200 rounded-r-xl border border-l-0 border-beige-300 text-charcoal transition-colors cursor-pointer"
                  aria-label="Tambah jumlah orang"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {paxError && (
                <p className="text-[11px] text-burgundy font-medium mt-1">
                  {paxError}
                </p>
              )}
            </div>
          </div>

          {/* Invitation Status & RSVP Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invitation Status */}
            <div>
              <label htmlFor="guest-invitation" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Status Undangan
              </label>
              <select
                id="guest-invitation"
                value={invitationStatus}
                onChange={(e) => setInvitationStatus(e.target.value as GuestInvitationStatus)}
                className="w-full px-3 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all cursor-pointer"
              >
                {ALL_GUEST_INVITATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {GUEST_INVITATION_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            {/* RSVP Status */}
            <div>
              <label htmlFor="guest-rsvp" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                Status Kehadiran (RSVP)
              </label>
              <select
                id="guest-rsvp"
                value={rsvpStatus}
                onChange={(e) => setRsvpStatus(e.target.value as GuestRsvpStatus)}
                className="w-full px-3 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all cursor-pointer"
              >
                {ALL_GUEST_RSVP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {GUEST_RSVP_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label htmlFor="guest-phone" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Nomor Telepon / WhatsApp <span className="font-normal text-charcoal-300">(Opsional)</span>
            </label>
            <input
              id="guest-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="guest-notes" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Catatan <span className="font-normal text-charcoal-300">(Opsional)</span>
            </label>
            <textarea
              id="guest-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan alamat kirim undangan, relasi keluarga, atau informasi lainnya..."
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all resize-none"
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 flex justify-end gap-3 border-t border-beige">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors cursor-pointer min-h-touch"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-burgundy hover:bg-burgundy-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer min-h-touch"
            >
              {mode === 'create' ? 'Simpan Tamu' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
