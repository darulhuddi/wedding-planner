import React, { useState } from 'react';
import { Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { calculateDaysUntilWedding, formatIndonesianDate } from '../../utils/onboardingUtils';

export interface WeddingDateStepProps {
  value: string; // YYYY-MM-DD
  onNext: (weddingDate: string, daysUntilWedding: number) => void;
  onBack: () => void;
}

export const WeddingDateStep: React.FC<WeddingDateStepProps> = ({
  value,
  onNext,
  onBack,
}) => {
  const [dateStr, setDateStr] = useState(value || '');
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const calculatedDays = dateStr ? calculateDaysUntilWedding(dateStr) : 0;
  const formattedDate = dateStr ? formatIndonesianDate(dateStr) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr) {
      setError('Mohon pilih tanggal pernikahanmu');
      return;
    }

    const selectedDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime())) {
      setError('Format tanggal tidak valid');
      return;
    }

    if (selectedDate < today) {
      setError('Tanggal pernikahan tidak boleh di masa lalu');
      return;
    }

    setError('');
    onNext(dateStr, calculatedDays);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-4 shadow-2xs">
          <Calendar className="w-6 h-6 text-burgundy" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-charcoal tracking-tight">
          Kapan Hari-H?
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-2 leading-relaxed max-w-md mx-auto">
          Tentukan tanggal pernikahanmu. WedSiap akan menggunakannya untuk menghitung waktu yang tersisa dan membantu menentukan prioritas persiapan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="weddingDate" className="block text-xs sm:text-sm font-semibold text-charcoal mb-2">
            Tanggal Pernikahan
          </label>
          <input
            id="weddingDate"
            type="date"
            min={todayStr}
            value={dateStr}
            onChange={(e) => {
              setDateStr(e.target.value);
              if (error) setError('');
            }}
            className={`w-full px-4 py-3.5 bg-ivory-50 border rounded-xl text-sm sm:text-base text-charcoal focus:outline-none transition-all min-h-touch ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-beige focus:border-burgundy focus:ring-1 focus:ring-burgundy bg-white'
            }`}
          />
          {error && (
            <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1.5 animate-fadeIn">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}

          {/* Dynamic Countdown Preview */}
          {dateStr && !error && (
            <div className="mt-4 p-4 rounded-xl bg-ivory-100/70 border border-beige flex items-center justify-between animate-fadeIn">
              <div>
                <span className="text-[11px] uppercase font-bold text-gold-600 tracking-wider block">
                  Estimasi Hari-H
                </span>
                <span className="text-sm font-medium text-charcoal block mt-0.5">
                  {formattedDate}
                </span>
              </div>
              <div className="text-right">
                <span className="font-serif text-xl sm:text-2xl font-bold text-burgundy block leading-tight">
                  {calculatedDays} <span className="text-xs font-sans font-medium text-charcoal-400">hari lagi</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onBack}
            icon={<ArrowLeft className="w-4 h-4" />}
            iconPosition="left"
            className="flex-1"
          >
            Kembali
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
            className="flex-1"
          >
            Lanjut
          </Button>
        </div>
      </form>
    </div>
  );
};
