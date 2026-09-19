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

  const displayEvents = sortedEvents.slice(0, 3);
  const totalCount = sortedEvents.length;

  return (
    <section className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-beige pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal leading-tight">
              Rangkaian Acara
            </h2>
            <p className="text-[11px] sm:text-xs text-charcoal-400 truncate mt-0.5">
              {totalCount > 0
                ? `${displayEvents.length} acara terdekat dari total ${totalCount} acara`
                : 'Overview jadwal prosesi & resepsi'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEventsModal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy hover:text-burgundy-800 transition-colors py-1 px-2.5 rounded-xl hover:bg-burgundy-50 cursor-pointer shrink-0"
        >
          <span>Kelola Acara</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Events List / Empty State */}
      {totalCount === 0 ? (
        <div className="p-5 text-center rounded-2xl bg-ivory-50/70 border border-dashed border-beige-300 space-y-2">
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
            className="mt-1 text-xs"
          >
            Tambah Acara
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {displayEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={onOpenEventsModal}
              className="p-3 sm:p-3.5 rounded-xl bg-ivory-50/60 border border-beige hover:border-beige-300 hover:bg-ivory-50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs group"
            >
              {/* Date & Event Name */}
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                {ev.date ? (
                  <div className="shrink-0 w-20 text-charcoal-600 font-medium text-[11px] sm:text-xs">
                    {formatIndonesianDate(ev.date)}
                  </div>
                ) : (
                  <div className="shrink-0 w-20 text-charcoal-400 text-[11px]">
                    Belum dijadwalkan
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-xs sm:text-sm font-bold text-charcoal group-hover:text-burgundy transition-colors truncate">
                    {ev.name}
                  </h3>
                  <span className="text-[10px] uppercase font-semibold text-gold-600 tracking-wider">
                    {EVENT_TYPE_LABELS[ev.type] || ev.type}
                  </span>
                </div>
              </div>

              {/* Time & Location */}
              <div className="flex flex-col sm:items-end text-[11px] text-charcoal-500 shrink-0 pl-23 sm:pl-0">
                {(ev.startTime || ev.endTime) && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-charcoal-400" />
                    <span>
                      {ev.startTime || '—'}{ev.endTime ? `–${ev.endTime}` : ''}
                    </span>
                  </div>
                )}
                {ev.location && (
                  <div className="flex items-center gap-1 text-charcoal-400 max-w-[140px] truncate">
                    <MapPin className="w-3 h-3 text-charcoal-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Bottom link */}
          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={onOpenEventsModal}
              className="text-xs font-semibold text-burgundy hover:text-burgundy-800 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Lihat semua acara</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
