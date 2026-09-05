import React from 'react';
import { TaskItem, TaskStatus } from '../../types/checklist';
import { ADMINISTRATIVE_TEMPLATES } from '../../domain/administration/templates';
import { X, BookOpen, Lightbulb, Lock, Calendar } from 'lucide-react';

interface AdministrationTaskDrawerProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const AdministrationTaskDrawer: React.FC<AdministrationTaskDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  if (!isOpen || !task) return null;

  const tpl = task.templateId ? ADMINISTRATIVE_TEMPLATES[task.templateId] : null;

  const renderBadge = () => {
    if (!tpl) return null;
    const level = tpl.metadata.requirementLevel;

    if (level === 'NATIONAL_REQUIREMENT') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF2F3] text-burgundy border border-[#F6D5D8]">
          🏛️ Wajib Nasional (Regulasi)
        </span>
      );
    }
    if (level === 'LOCAL_SERVICE_PRACTICE') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          📋 Standar Layanan KUA
        </span>
      );
    }
    if (level === 'CONFIRM_WITH_KUA') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          ⚠️ Perlu Konfirmasi KUA Setempat
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-ivory-200 text-charcoal-500 border border-beige">
        💡 Rekomendasi Perencanaan
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-charcoal-900/40 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-beige-200">
        
        {/* Header */}
        <div className="p-6 border-b border-beige-200 flex items-start justify-between bg-ivory-50">
          <div className="space-y-2.5 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              {renderBadge()}
              {task.dueDate && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-charcoal-500 bg-white border border-beige px-2.5 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3 text-charcoal-400" />
                  Target: {task.dueDate}
                </span>
              )}
            </div>
            <h2 className="font-serif text-xl font-bold text-charcoal leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-charcoal p-2 rounded-xl hover:bg-ivory-200 transition-colors"
            aria-label="Tutup detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Status Quick Selector */}
          <div className="bg-ivory-50 p-4 rounded-2xl border border-beige-200">
            <label className="block text-[11px] font-bold text-charcoal-400 uppercase tracking-wider mb-2.5">
              Status Kesiapan Dokumen / Urusan:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'todo')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  task.status === 'todo'
                    ? 'bg-white text-charcoal shadow-sm border border-beige-300 ring-2 ring-burgundy/10'
                    : 'text-charcoal-500 hover:bg-ivory-200'
                }`}
              >
                ⚪ Belum Mulai
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'in_progress')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  task.status === 'in_progress'
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                    : 'text-charcoal-500 hover:bg-ivory-200'
                }`}
              >
                🟡 Sedang Diurus
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'completed')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  task.status === 'completed'
                    ? 'bg-burgundy text-white shadow-sm ring-2 ring-burgundy/30'
                    : 'text-charcoal-500 hover:bg-ivory-200'
                }`}
              >
                🟢 Sudah Siap
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-xs font-bold text-charcoal-400 uppercase tracking-wider mb-2">
                Petunjuk Pelaksanaan
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed bg-white p-4 rounded-2xl border border-beige-200 shadow-2xs">
                {task.description}
              </p>
            </div>
          )}

          {/* Official Grounding & Reference */}
          {tpl && (
            <div className="space-y-4">
              <div className="bg-[#FAF6F6] border border-[#F2E4E4] rounded-2xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-burgundy uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Dasar Hukum Resmi</span>
                </h4>
                <p className="text-xs font-bold text-charcoal-700 mb-1">{tpl.metadata.sourceReference}</p>
                <p className="text-xs text-charcoal-500 leading-relaxed">{tpl.metadata.explanation}</p>
              </div>

              {tpl.metadata.practicalTips && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tips Lapangan WedSiap</span>
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">{tpl.metadata.practicalTips}</p>
                </div>
              )}
            </div>
          )}

          {/* Zero Document Vault Notice */}
          <div className="text-xs text-charcoal-400 bg-ivory-50 p-4 rounded-2xl border border-beige flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-charcoal-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              WedSiap menghormati privasi datamu. Dokumen fisik (KTP/KK/Akta) tidak diunggah ke server, kamu hanya perlu menandai kesiapannya di sini.
            </p>
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-beige-200 bg-ivory-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-charcoal-600 hover:text-charcoal hover:bg-ivory-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
