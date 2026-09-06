import React from 'react';
import { WeddingEvent, EVENT_TYPE_LABELS } from '../../domain/events';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import { CalendarDays, MapPin, Clock, ArrowRight, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DashboardEventsOverviewProps {
  events: WeddingEvent[];
  onOpenEventsModal: () => void;
}

export const DashboardEventsOverview: React.FC<DashboardEventsOverviewProps> = ({
  events,
  onOpenEventsModal,
}) => {
  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  return (
    <section className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-beige pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">
              Rangkaian Acara
            </h2>
            <p className="text-xs text-charcoal-400">
              Overview jadwal hari prosesi & resepsi pernikahan
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEventsModal}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy hover:text-burgundy-800 transition-colors py-1 px-2.5 rounded-xl hover:bg-burgundy-50 cursor-pointer shrink-0"
        >
          <span>Kelola Acara</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Events List / Empty State */}
      {sortedEvents.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-ivory-50/70 border border-dashed border-beige-300 space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-charcoal">
            Belum ada rangkaian acara yang dicatat
          </p>
          <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
            Catat jadwal prosesi seperti Akad Nikah, Pemberkatan, atau Resepsi untuk memudahkan koordinasi waktu.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenEventsModal}
            icon={<Plus className="w-3.5 h-3.5" />}
            iconPosition="left"
            className="mt-2 text-xs"
          >
            Tambah Acara
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sortedEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige hover:border-beige-300 transition-colors flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white border border-beige text-gold-600">
                    {EVENT_TYPE_LABELS[ev.type] || ev.type}
                  </span>
                  {ev.date && (
                    <span className="text-[11px] font-semibold text-charcoal-500">
                      {formatIndonesianDate(ev.date)}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal truncate mt-1">
                  {ev.name}
                </h3>
              </div>

              <div className="space-y-1 text-xs text-charcoal-500 pt-1 border-t border-beige/60">
                {(ev.startTime || ev.endTime) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-charcoal-400 shrink-0" />
                    <span>
                      {ev.startTime || '—'} {ev.endTime ? `– ${ev.endTime}` : ''}
                    </span>
                  </div>
                )}
                {ev.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-charcoal-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
