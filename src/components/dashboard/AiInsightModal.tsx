import React from 'react';
import { Sparkles, X, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface AiInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiInsightModal: React.FC<AiInsightModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-insight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-beige-300 shadow-xl max-w-md w-full relative space-y-4 text-charcoal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-beige">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold-100 border border-gold-200 text-gold-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-gold-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-insight-title" className="font-serif text-lg font-bold text-charcoal">
                  Tentang AI Insight
                </h3>
                <span className="text-[10px] font-semibold bg-gold-50 text-gold-800 border border-gold-200 px-1.5 py-0.2 rounded">
                  ✦ AI Insight
                </span>
              </div>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Transparansi alur rekomendasi persiapan WedSiap
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal hover:bg-ivory-100 transition-colors cursor-pointer"
            aria-label="Tutup penjelasan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Explanatory Points */}
        <div className="space-y-3 text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-ivory-50 border border-beige">
            <ShieldCheck className="w-4 h-4 text-burgundy shrink-0 mt-0.5" />
            <div>
              <strong className="text-charcoal font-semibold block mb-0.5">
                Prioritas Berbasis Engine WedSiap
              </strong>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                Urutan dan ranking tugas dihitung secara terukur oleh sistem perencanaan WedSiap berdasarkan tanggal pernikahan, modul yang belum selesai, dan timeline persiapanmu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-ivory-50 border border-beige">
            <Sparkles className="w-4 h-4 text-gold-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-charcoal font-semibold block mb-0.5">
                Peran AI sebagai Insight Layer
              </strong>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                AI digunakan untuk membaca konteks langkah aktif dan merangkum panduan praktis (alasan & fokus), sehingga kamu tahu dengan pasti apa yang harus dilakukan tanpa kebingungan.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
