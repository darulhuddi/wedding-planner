import React, { useState } from 'react';
import { Target, ArrowRight, ArrowLeft, Wallet, CheckSquare, Users, CalendarRange, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { PlanningPriority, PriorityOption } from '../../types/onboarding';

export interface PriorityStepProps {
  initialPriority: PlanningPriority | '';
  onNext: (priority: PlanningPriority) => void;
  onBack: () => void;
}

export const PriorityStep: React.FC<PriorityStepProps> = ({
  initialPriority,
  onNext,
  onBack,
}) => {
  const [selected, setSelected] = useState<PlanningPriority | ''>(initialPriority || '');
  const [error, setError] = useState('');

  const options: PriorityOption[] = [
    {
      id: 'budget',
      title: 'Budget',
      description: 'Mengontrol dan membagi budget pernikahan',
      tag: 'Kontrol Keuangan',
    },
    {
      id: 'checklist',
      title: 'Checklist',
      description: 'Menyusun apa saja yang harus disiapkan',
      tag: 'Urutan Tugas',
    },
    {
      id: 'vendor',
      title: 'Vendor',
      description: 'Mengatur dan mencari vendor',
      tag: 'Manajemen Vendor',
    },
    {
      id: 'timeline',
      title: 'Timeline',
      description: 'Menentukan kapan setiap persiapan harus dilakukan',
      tag: 'Alur Waktu',
    },
  ];

  const getPriorityIcon = (id: PlanningPriority) => {
    switch (id) {
      case 'budget': return <Wallet className="w-5 h-5 text-burgundy" />;
      case 'checklist': return <CheckSquare className="w-5 h-5 text-burgundy" />;
      case 'vendor': return <Users className="w-5 h-5 text-burgundy" />;
      case 'timeline': return <CalendarRange className="w-5 h-5 text-burgundy" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError('Mohon pilih satu fokus utama persiapannmu');
      return;
    }
    setError('');
    onNext(selected as PlanningPriority);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-4 shadow-2xs">
          <Target className="w-6 h-6 text-burgundy" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-charcoal tracking-tight">
          Apa yang Paling Ingin Kamu Bereskan?
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-2 leading-relaxed max-w-md mx-auto">
          Pilih satu fokus utama. Ini membantu WedSiap menentukan langkah pertama yang paling relevan untukmu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  setSelected(opt.id);
                  if (error) setError('');
                }}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between min-h-touch ${
                  isSelected
                    ? 'bg-burgundy-50/80 border-burgundy-300 shadow-soft ring-2 ring-burgundy/20'
                    : 'bg-ivory-50/60 border-beige hover:border-beige-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isSelected ? 'bg-white border-burgundy-200 shadow-2xs' : 'bg-white border-beige'}`}>
                    {getPriorityIcon(opt.id)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-base sm:text-lg font-semibold text-charcoal">
                        {opt.title}
                      </h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-600 bg-white px-2 py-0.5 rounded-md border border-beige">
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-charcoal-400 mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? 'bg-burgundy border-burgundy text-white' : 'border-charcoal-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-red-600 font-medium text-center flex items-center justify-center gap-1.5 animate-fadeIn">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        )}

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
            className="flex-1 font-semibold"
          >
            Siapkan Workspace
          </Button>
        </div>
      </form>
    </div>
  );
};
