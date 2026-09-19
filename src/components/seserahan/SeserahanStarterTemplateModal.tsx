import React, { useState } from 'react';
import { X, Sparkles, Check, Gift, Layers, Compass } from 'lucide-react';
import { SESERAHAN_TEMPLATES, SeserahanTemplateType } from '../../domain/seserahan/templates';

export interface SeserahanStarterTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (templateType: SeserahanTemplateType, budget: number) => Promise<void> | void;
}

export const SeserahanStarterTemplateModal: React.FC<SeserahanStarterTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedType, setSelectedType] = useState<SeserahanTemplateType>('standard');
  const [budgetStr, setBudgetStr] = useState<string>(
    String(SESERAHAN_TEMPLATES.standard.recommendedBudget)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (type: SeserahanTemplateType) => {
    setSelectedType(type);
    setBudgetStr(String(SESERAHAN_TEMPLATES[type].recommendedBudget));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const budget = Number(budgetStr.replace(/\D/g, '')) || 0;
    if (budget < 0) {
      setError('Budget seserahan tidak boleh negatif.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(selectedType, budget);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat rencana seserahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedBudget = budgetStr ? Number(budgetStr.replace(/\D/g, '')).toLocaleString('id-ID') : '0';

  const templateIcons: Record<SeserahanTemplateType, React.ReactNode> = {
    basic: <Gift className="w-5 h-5 text-burgundy" />,
    standard: <Sparkles className="w-5 h-5 text-burgundy" />,
    complete: <Layers className="w-5 h-5 text-burgundy" />,
    custom: <Compass className="w-5 h-5 text-burgundy" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-6 sm:p-7 relative my-8 animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal p-1.5 rounded-full hover:bg-beige-100 transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-md mx-auto mb-6">
          <div className="w-10 h-10 rounded-2xl bg-burgundy/10 flex items-center justify-center text-burgundy mx-auto mb-3">
            <Gift className="w-5 h-5" />
          </div>
          <h2 id="template-modal-title" className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
            Bagaimana kamu ingin memulai?
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            Pilih template awal sesuai kebutuhanmu. Seluruh kategori dan barang nantinya tetap dapat kamu ubah bebas.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(['basic', 'standard', 'complete', 'custom'] as SeserahanTemplateType[]).map((type) => {
              const tmpl = SESERAHAN_TEMPLATES[type];
              const isSelected = selectedType === type;
              const itemCount = tmpl.categories.reduce((sum, c) => sum + c.items.length, 0);

              return (
                <div
                  key={type}
                  onClick={() => handleSelectTemplate(type)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-burgundy-50/60 border-burgundy shadow-sm ring-1 ring-burgundy'
                      : 'bg-ivory-50/60 border-beige-300 hover:border-beige-400 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-beige-300 flex items-center justify-center shrink-0">
                          {templateIcons[type]}
                        </div>
                        <div>
                          <h3 className="font-serif text-base font-bold text-charcoal">
                            {tmpl.title}
                          </h3>
                          <span className="text-[10px] font-semibold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full border border-gold-200">
                            {tmpl.badge}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-burgundy bg-burgundy text-white'
                            : 'border-beige-400 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-xs text-charcoal-500 leading-relaxed mb-3">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-beige text-[11px] text-charcoal-400 flex items-center justify-between">
                    <span>
                      {tmpl.categories.length > 0
                        ? `${tmpl.categories.length} kategori • ${itemCount} item`
                        : 'Mulai dari kosong'}
                    </span>
                    {tmpl.recommendedBudget > 0 && (
                      <span className="font-semibold text-charcoal-600">
                        Est. Rp{(tmpl.recommendedBudget / 1000000).toLocaleString('id-ID')} jt
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget Input Field */}
          <div className="p-4 bg-ivory-100/70 border border-beige rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label htmlFor="starter-budget" className="text-xs font-semibold text-charcoal">
                Target Budget Seserahan (Dapat diubah kapan saja)
              </label>
              <span className="text-[11px] text-charcoal-400">
                Opsional
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm font-medium pointer-events-none">
                Rp
              </span>
              <input
                id="starter-budget"
                type="text"
                inputMode="numeric"
                value={formattedBudget}
                onChange={(e) => setBudgetStr(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-11 pr-4 py-2 bg-white border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-charcoal-500 hover:text-charcoal hover:bg-beige-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyiapkan...' : 'Mulai Susun Seserahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
