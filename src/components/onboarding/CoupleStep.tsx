import React, { useState } from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { Button } from '../ui/Button';

export interface CoupleStepProps {
  value: string;
  onNext: (coupleName: string) => void;
}

export const CoupleStep: React.FC<CoupleStepProps> = ({ value, onNext }) => {
  const [name, setName] = useState(value || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Mohon masukkan nama pasangan (misal: Adit & Nisa)');
      return;
    }
    if (trimmed.length < 2) {
      setError('Nama pasangan minimal 2 karakter');
      return;
    }

    setError('');
    onNext(trimmed);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-4 shadow-2xs">
          <Heart className="w-6 h-6 fill-burgundy text-burgundy" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-charcoal tracking-tight">
          Ceritakan Pernikahanmu
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-2 leading-relaxed max-w-md mx-auto">
          Mulai dengan nama yang ingin kamu gunakan untuk wedding workspace-mu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="coupleName" className="block text-xs sm:text-sm font-semibold text-charcoal mb-2">
            Nama Pasangan
          </label>
          <input
            id="coupleName"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Adit & Nisa"
            className={`w-full px-4 py-3.5 bg-ivory-50 border rounded-xl text-sm sm:text-base text-charcoal placeholder:text-charcoal-300 focus:outline-none transition-all min-h-touch ${
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
          <p className="text-[11px] text-charcoal-300 mt-2">
            Tip: Kamu bisa menggunakan nama kalian berdua (contoh: Adit & Nisa).
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Lanjut
          </Button>
        </div>
      </form>
    </div>
  );
};
