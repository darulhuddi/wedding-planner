import React, { useState } from 'react';
import { StoredWorkspace } from '../../types/workspace';
import { ReligiousTradition, ReligiousContext, CulturalContext, normalizeReligiousContexts, normalizeCulturalContext } from '../../domain/context';
import { Button } from '../ui/Button';
import { Compass, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ContextSettingsProps {
  storedWorkspace: StoredWorkspace;
  onWorkspaceChange: (updated: StoredWorkspace) => Promise<void> | void;
}

const RELIGION_OPTIONS: { id: ReligiousTradition; label: string }[] = [
  { id: 'islam', label: 'Islam' },
  { id: 'christian', label: 'Kristen' },
  { id: 'catholic', label: 'Katolik' },
  { id: 'hindu', label: 'Hindu' },
  { id: 'buddhist', label: 'Buddha' },
  { id: 'confucian', label: 'Khonghucu' },
  { id: 'belief', label: 'Kepercayaan' },
  { id: 'other', label: 'Tradisi lain' },
  { id: 'mixed', label: 'Campuran / lintas tradisi' },
  { id: 'unspecified', label: 'Belum menentukan' },
];

export const ContextSettings: React.FC<ContextSettingsProps> = ({
  storedWorkspace,
  onWorkspaceChange,
}) => {
  // Religious context state
  const initialReligion = storedWorkspace.religiousContexts?.[0]?.tradition || 'unspecified';
  const [selectedReligion, setSelectedReligion] = useState<ReligiousTradition>(initialReligion);
  const [isReligionSaving, setIsReligionSaving] = useState(false);
  const [religionStatus, setReligionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cultural context state
  const initialCulture = normalizeCulturalContext(storedWorkspace.culturalContext);
  const [hasTradition, setHasTradition] = useState<boolean | null>(initialCulture.hasTradition);
  const [cultureDescription, setCultureDescription] = useState<string>(initialCulture.description || '');
  const [isCultureSaving, setIsCultureSaving] = useState(false);
  const [cultureStatus, setCultureStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Save Religious Context
  const handleSaveReligion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReligionSaving) return;

    setIsReligionSaving(true);
    setReligionStatus(null);

    try {
      const religiousContexts: ReligiousContext[] =
        selectedReligion === 'unspecified'
          ? []
          : [{ tradition: selectedReligion, label: null }];

      const updated: StoredWorkspace = {
        ...storedWorkspace,
        religiousContexts: normalizeReligiousContexts(religiousContexts),
        updatedAt: new Date().toISOString(),
      };

      await onWorkspaceChange(updated);
      setReligionStatus({ type: 'success', text: 'Perubahan berhasil disimpan.' });
      setTimeout(() => setReligionStatus(null), 3000);
    } catch (err) {
      console.error('[WedFlow] Failed to save religious context:', err);
      setReligionStatus({ type: 'error', text: 'Perubahan belum tersimpan. Coba lagi.' });
    } finally {
      setIsReligionSaving(false);
    }
  };

  // Save Cultural Context
  const handleSaveCulture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCultureSaving) return;

    setIsCultureSaving(true);
    setCultureStatus(null);

    try {
      const culturalContext: CulturalContext = {
        hasTradition,
        description: hasTradition === true ? cultureDescription.trim() || null : null,
      };

      const updated: StoredWorkspace = {
        ...storedWorkspace,
        culturalContext: normalizeCulturalContext(culturalContext),
        updatedAt: new Date().toISOString(),
      };

      await onWorkspaceChange(updated);
      setCultureStatus({ type: 'success', text: 'Perubahan berhasil disimpan.' });
      setTimeout(() => setCultureStatus(null), 3000);
    } catch (err) {
      console.error('[WedFlow] Failed to save cultural context:', err);
      setCultureStatus({ type: 'error', text: 'Perubahan belum tersimpan. Coba lagi.' });
    } finally {
      setIsCultureSaving(false);
    }
  };

  const isReligionChanged = selectedReligion !== initialReligion;
  const isCultureChanged =
    hasTradition !== initialCulture.hasTradition ||
    (hasTradition === true && (cultureDescription.trim() || null) !== (initialCulture.description || null));

  return (
    <div className="space-y-6">
      {/* 1. Konteks Keagamaan */}
      <section className="bg-white rounded-2xl border border-beige p-5 sm:p-6 shadow-soft space-y-5">
        <div className="border-b border-beige pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Konteks Keagamaan</h2>
              <p className="text-xs sm:text-sm text-charcoal-400">
                Membantu menyesuaikan saran istilah dan prosesi pernikahan (opsional)
              </p>
            </div>
          </div>
        </div>

        {religionStatus && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm ${
              religionStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {religionStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{religionStatus.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveReligion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {RELIGION_OPTIONS.map((opt) => {
              const isSelected = selectedReligion === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-burgundy-50/80 border-burgundy-200 text-burgundy font-semibold shadow-2xs'
                      : 'bg-ivory-50/60 border-beige text-charcoal hover:bg-white hover:border-beige-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="religion"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => setSelectedReligion(opt.id)}
                    className="text-burgundy focus:ring-burgundy/30 accent-burgundy"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isReligionSaving || !isReligionChanged}
            >
              {isReligionSaving ? 'Menyimpan...' : 'Simpan Konteks Keagamaan'}
            </Button>
          </div>
        </form>
      </section>

      {/* 2. Tradisi & Adat */}
      <section className="bg-white rounded-2xl border border-beige p-5 sm:p-6 shadow-soft space-y-5">
        <div className="border-b border-beige pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Tradisi & Adat</h2>
              <p className="text-xs sm:text-sm text-charcoal-400">
                Informasi kontekstual untuk rangkaian adat pernikahan (opsional)
              </p>
            </div>
          </div>
        </div>

        {cultureStatus && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm ${
              cultureStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {cultureStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{cultureStatus.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveCulture} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-charcoal mb-2.5">
              Apakah ada tradisi atau adat yang ingin kamu gunakan?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { val: true, label: 'Ya' },
                { val: false, label: 'Tidak' },
                { val: null, label: 'Belum yakin' },
              ].map((opt, idx) => {
                const isSelected = hasTradition === opt.val;
                return (
                  <label
                    key={idx}
                    className={`flex items-center justify-center p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all text-center ${
                      isSelected
                        ? 'bg-gold-50/80 border-gold-300 text-gold-900 font-semibold shadow-2xs'
                        : 'bg-ivory-50/60 border-beige text-charcoal hover:bg-white hover:border-beige-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="hasTradition"
                      checked={isSelected}
                      onChange={() => setHasTradition(opt.val)}
                      className="sr-only"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {hasTradition === true && (
            <div className="space-y-1.5 pt-2 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider">
                Ceritakan sedikit
              </label>
              <textarea
                rows={3}
                value={cultureDescription}
                onChange={(e) => setCultureDescription(e.target.value)}
                placeholder="Contoh: Rencana adat Jawa (Siraman & Midodareni), adat Sunda, atau tradisi keluarga tertentu..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
              />
              <p className="text-[11px] text-charcoal-400">
                Informasi ini bersifat catatan kontekstual dan tidak membuat tugas baru secara otomatis.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isCultureSaving || !isCultureChanged}
            >
              {isCultureSaving ? 'Menyimpan...' : 'Simpan Tradisi & Adat'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};
