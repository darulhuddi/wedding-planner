import React, { useState } from 'react';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Building2, Utensils, Camera, Sparkles, Palette, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { CategoryId } from '../../types/onboarding';

export interface PreparationStepProps {
  initialCompleted: CategoryId[];
  onNext: (completedCategories: CategoryId[]) => void;
  onBack: () => void;
}

interface CategoryOption {
  id: CategoryId;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

export const PreparationStep: React.FC<PreparationStepProps> = ({
  initialCompleted,
  onNext,
  onBack,
}) => {
  const [selected, setSelected] = useState<CategoryId[]>(initialCompleted || []);

  const categories: CategoryOption[] = [
    {
      id: 'venue',
      label: 'Venue & Gedung',
      desc: 'Lokasi & tanggal utama',
      icon: <Building2 className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'catering',
      label: 'Catering',
      desc: 'Paket makanan & menu',
      icon: <Utensils className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'photography',
      label: 'Foto & Video',
      desc: 'Tim liputan dokumentasi',
      icon: <Camera className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'decoration',
      label: 'Dekorasi',
      desc: 'Konsep & tata pelaminan',
      icon: <Sparkles className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'makeup_attire',
      label: 'MUA & Busana',
      desc: 'Rias & gaun pengantin',
      icon: <Palette className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'invitation',
      label: 'Undangan',
      desc: 'Daftar tamu & RSVP',
      icon: <Mail className="w-5 h-5 text-burgundy" />,
    },
  ];

  const toggleCategory = (id: CategoryId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(selected);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-4 shadow-2xs">
          <CheckCircle2 className="w-6 h-6 text-burgundy" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-charcoal tracking-tight">
          Sejauh Mana Persiapanmu?
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-2 leading-relaxed max-w-md mx-auto">
          Pilih yang sudah kamu siapkan. Sisanya akan kami masukkan sebagai bagian dari rencana awalmu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => {
            const isChecked = selected.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between min-h-touch ${
                  isChecked
                    ? 'bg-burgundy-50/70 border-burgundy-300 shadow-2xs ring-1 ring-burgundy/20'
                    : 'bg-ivory-50/60 border-beige hover:border-beige-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isChecked ? 'bg-white border-burgundy-200' : 'bg-white border-beige'}`}>
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-charcoal block truncate">
                      {cat.label}
                    </span>
                    <span className="text-[11px] text-charcoal-400 block truncate">
                      {cat.desc}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isChecked ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-burgundy bg-white px-2.5 py-1 rounded-full border border-burgundy-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-burgundy" />
                      <span>Sudah</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-charcoal-400 bg-white/80 px-2.5 py-1 rounded-full border border-beige">
                      <Circle className="w-3.5 h-3.5 text-charcoal-300" />
                      <span>Belum</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Counter Summary */}
        <div className="text-center text-xs text-charcoal-400 py-1">
          <span>{selected.length} dari 6 kategori telah diselesaikan</span>
          {selected.length === 0 && (
            <span className="block text-[11px] text-charcoal-300 mt-0.5">
              (Kamu bisa langsung lanjut jika belum ada yang disiapkan)
            </span>
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
