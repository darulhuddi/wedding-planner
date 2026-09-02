import React, { useState } from 'react';
import { DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatRupiahNumber, parseRupiahInput } from '../../utils/onboardingUtils';

export interface WeddingOverviewStepProps {
  initialBudget: number;
  initialGuestCount: number;
  onNext: (budget: number, guestCount: number) => void;
  onBack: () => void;
}

export const WeddingOverviewStep: React.FC<WeddingOverviewStepProps> = ({
  initialBudget,
  initialGuestCount,
  onNext,
  onBack,
}) => {
  const [budgetDisplay, setBudgetDisplay] = useState<string>(
    initialBudget ? formatRupiahNumber(initialBudget) : 'Rp100.000.000'
  );
  const [guestCount, setGuestCount] = useState<string>(
    initialGuestCount ? String(initialGuestCount) : '400'
  );
  const [budgetError, setBudgetError] = useState('');
  const [guestError, setGuestError] = useState('');

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseRupiahInput(e.target.value);
    setBudgetDisplay(rawVal > 0 ? formatRupiahNumber(rawVal) : '');
    if (budgetError) setBudgetError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    const rawBudget = parseRupiahInput(budgetDisplay);
    if (!rawBudget || rawBudget <= 0) {
      setBudgetError('Mohon masukkan perkiraan budget yang valid');
      valid = false;
    }

    const guests = parseInt(guestCount, 10);
    if (isNaN(guests) || guests <= 0) {
      setGuestError('Mohon masukkan jumlah tamu yang valid (> 0)');
      valid = false;
    }

    if (!valid) return;

    setBudgetError('');
    setGuestError('');
    onNext(rawBudget, guests);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-4 shadow-2xs">
          <DollarSign className="w-6 h-6 text-burgundy" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-charcoal tracking-tight">
          Gambaran Awal
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-2 leading-relaxed max-w-md mx-auto">
          Beri kami dua angka dasar supaya workspace-mu langsung punya konteks.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Budget Input */}
          <div>
            <label htmlFor="budgetInput" className="block text-xs sm:text-sm font-semibold text-charcoal mb-2">
              Perkiraan Budget
            </label>
            <input
              id="budgetInput"
              type="text"
              inputMode="numeric"
              value={budgetDisplay}
              onChange={handleBudgetChange}
              placeholder="Rp100.000.000"
              className={`w-full px-4 py-3.5 bg-ivory-50 border rounded-xl text-sm sm:text-base text-charcoal focus:outline-none transition-all min-h-touch ${
                budgetError
                  ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-beige focus:border-burgundy focus:ring-1 focus:ring-burgundy bg-white'
              }`}
            />
            {budgetError ? (
              <p className="text-xs text-red-600 mt-1.5 font-medium">{budgetError}</p>
            ) : (
              <p className="text-[11px] text-charcoal-300 mt-1.5">Contoh: Rp100.000.000</p>
            )}
          </div>

          {/* Guest Count Input */}
          <div>
            <label htmlFor="guestCountInput" className="block text-xs sm:text-sm font-semibold text-charcoal mb-2">
              Perkiraan Jumlah Tamu
            </label>
            <input
              id="guestCountInput"
              type="number"
              min="1"
              step="1"
              value={guestCount}
              onChange={(e) => {
                setGuestCount(e.target.value);
                if (guestError) setGuestError('');
              }}
              placeholder="400"
              className={`w-full px-4 py-3.5 bg-ivory-50 border rounded-xl text-sm sm:text-base text-charcoal focus:outline-none transition-all min-h-touch ${
                guestError
                  ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-beige focus:border-burgundy focus:ring-1 focus:ring-burgundy bg-white'
              }`}
            />
            {guestError ? (
              <p className="text-xs text-red-600 mt-1.5 font-medium">{guestError}</p>
            ) : (
              <p className="text-[11px] text-charcoal-300 mt-1.5">Contoh: 400 undangan/tamu</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
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
