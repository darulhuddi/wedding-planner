import React, { useState } from 'react';
import {
  WeddingEvent,
  EventType,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  validateWeddingEvent,
} from '../../domain/events';
import { Button } from '../ui/Button';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface EventsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: WeddingEvent[];
  onEventCreate: (
    eventData: Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>
  ) => Promise<void | WeddingEvent>;
  onEventUpdate: (
    eventId: string,
    changes: Partial<WeddingEvent>
  ) => Promise<void | WeddingEvent>;
  onEventDelete: (eventId: string) => Promise<void>;
}

export const EventsManagementModal: React.FC<EventsManagementModalProps> = ({
  isOpen,
  onClose,
  events,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
}) => {
  // Sub-modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WeddingEvent | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('ceremony');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  // Status & loading
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Delete confirmation state
  const [deletingEvent, setDeletingEvent] = useState<WeddingEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const openCreateForm = () => {
    setEditingEvent(null);
    setName('');
    setType('ceremony');
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditForm = (ev: WeddingEvent) => {
    setEditingEvent(ev);
    setName(ev.name);
    setType(ev.type);
    setDate(ev.date || '');
    setStartTime(ev.startTime || '');
    setEndTime(ev.endTime || '');
    setLocation(ev.location || '');
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const payload: Partial<WeddingEvent> = {
      name: name.trim(),
      type,
      date: date || null,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location.trim() || null,
    };

    const validation = validateWeddingEvent(payload);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    setFormErrors([]);

    try {
      if (editingEvent) {
        await onEventUpdate(editingEvent.id, payload);
      } else {
        await onEventCreate({
          type,
          name: name.trim(),
          date: date || null,
          startTime: startTime || null,
          endTime: endTime || null,
          location: location.trim() || null,
        });
      }

      setStatusMessage({ type: 'success', text: 'Acara berhasil disimpan.' });
      setTimeout(() => setStatusMessage(null), 3000);
      setIsFormOpen(false);
    } catch (err) {
      console.error('[WedFlow] Failed to save event:', err);
      setStatusMessage({ type: 'error', text: 'Perubahan belum tersimpan. Coba lagi.' });
      setFormErrors(['Gagal menyimpan acara. Silakan coba lagi.']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent || isDeleting) return;
    setIsDeleting(true);

    try {
      await onEventDelete(deletingEvent.id);
      setStatusMessage({ type: 'success', text: 'Acara berhasil dihapus.' });
      setTimeout(() => setStatusMessage(null), 3000);
      setDeletingEvent(null);
    } catch (err) {
      console.error('[WedFlow] Failed to delete event:', err);
      setStatusMessage({ type: 'error', text: 'Perubahan belum tersimpan. Coba lagi.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border border-beige-200 shadow-modal max-w-2xl w-full flex flex-col my-auto overflow-hidden max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="events-modal-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-beige-200 flex items-center justify-between bg-ivory-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 id="events-modal-title" className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                Kelola Rangkaian Acara
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Atur jadwal prosesi (Akad, Pemberkatan, Resepsi, Adat)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-charcoal-400 hover:text-charcoal p-2 rounded-xl hover:bg-ivory-200 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Daftar Acara ({events.length})
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateForm}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
            >
              Tambah Acara
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-ivory-50 border border-dashed border-beige-300">
              <CalendarDays className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-charcoal">Belum ada acara pernikahan</p>
              <p className="text-xs text-charcoal-400 mt-1 max-w-sm mx-auto">
                Tambahkan rangkaian acara seperti Akad Nikah, Pemberkatan, atau Resepsi untuk mengelompokkan jadwal persiapan.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openCreateForm}
                className="mt-4"
              >
                Tambah Acara Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-ivory-50/70 border border-beige-200 flex flex-col justify-between gap-3 hover:border-beige-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white border border-beige text-gold-600 mb-1">
                          {EVENT_TYPE_LABELS[ev.type] || ev.type}
                        </span>
                        <h3 className="font-serif text-base font-bold text-charcoal">{ev.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(ev)}
                          className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal hover:bg-white border border-transparent hover:border-beige transition-colors cursor-pointer"
                          aria-label="Edit acara"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEvent(ev)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          aria-label="Hapus acara"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-charcoal-500">
                      {ev.date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                          <span>{ev.date}</span>
                        </div>
                      )}
                      {(ev.startTime || ev.endTime) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                          <span>
                            {ev.startTime || '—'} {ev.endTime ? `sampai ${ev.endTime}` : ''}
                          </span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-beige-200 flex justify-end bg-ivory-50 shrink-0">
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Selesai
          </Button>
        </div>

        {/* Form Modal: Create / Edit Event */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/70 backdrop-blur-xs">
            <div
              className="bg-white rounded-3xl border border-beige shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-beige pb-3">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {editingEvent ? 'Ubah Acara' : 'Tambah Acara Pernikahan'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs sm:text-sm space-y-1">
                  {formErrors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Nama Acara *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Akad Nikah, Pemberkatan, Siraman, Resepsi"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Jenis Acara *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy cursor-pointer"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {EVENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                      Jam Mulai
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                      Jam Selesai
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Masjid Agung / Hotel Mulia Jakarta"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-beige">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSaving}
                  >
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : editingEvent ? 'Simpan Perubahan' : 'Tambah Acara'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingEvent && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-charcoal-900/70 backdrop-blur-xs">
            <div
              className="bg-white rounded-2xl border border-beige shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-beige pb-3">
                <h3 className="font-serif text-lg font-bold text-rose-900">
                  Hapus Acara
                </h3>
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-charcoal-600 leading-relaxed">
                Apakah kamu yakin ingin menghapus acara <strong className="text-charcoal">{deletingEvent.name}</strong>?
              </p>
              <p className="text-xs text-charcoal-400 leading-relaxed bg-ivory-50 p-3 rounded-xl border border-beige">
                Tugas-tugas yang terhubung dengan acara ini tidak akan dihapus, melainkan akan tetap ada sebagai tugas umum pernikahan.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingEvent(null)}
                  disabled={isDeleting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="bg-rose-700 hover:bg-rose-800 text-white"
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Menghapus...' : 'Hapus Acara'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
