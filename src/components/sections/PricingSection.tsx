/**
 * [LEGACY / UNUSED COMPONENT]
 * Static landing page pricing section mockup.
 * Currently not imported or rendered in App.tsx or any consumer routes.
 * Authoritative commercial pricing is managed via public.platform_configurations
 * and rendered dynamically in /checkout via CheckoutPage.tsx.
 */

import React from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';

export interface PricingSectionProps {
  onOpenAuth: (mode: 'signup' | 'login') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenAuth }) => {
  return (
    <section id="harga" className="py-24 sm:py-32 lg:py-36 bg-ivory-100/40 border-t border-beige">
      <div className="max-w-container mx-auto px-6 sm:px-8 lg:px-12">
        <SectionHeader
          eyebrow="Harga Transparan"
          title="Sederhana, tanpa biaya tersembunyi."
          subtitle="Mulai gratis untuk mencoba alur persiapan pernikahanmu. Akses penuh tersedia kapan saja."
          align="center"
          className="mb-16 sm:mb-20"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 max-w-4xl mx-auto">
          
          {/* Plan 1: Free Starter */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-beige shadow-soft flex flex-col justify-between transition-all duration-200 hover:shadow-card">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-bold tracking-widest text-charcoal-400">
                  Starter Plan
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-ivory-200 text-charcoal-500 rounded-full">
                  Gratis Selamanya
                </span>
              </div>

              <h3 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
                Rp0
              </h3>
              <p className="text-xs text-charcoal-300 mt-1">
                Tanpa kartu kredit, langsung pakai.
              </p>

              <p className="text-sm text-charcoal-400 mt-4 pb-6 border-b border-beige leading-relaxed">
                Cocok untuk pasangan yang baru mulai merancang ide dasar dan estimasi tanggal hari-H.
              </p>

              <ul className="space-y-3 pt-6 text-sm text-charcoal-500">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Checklist standar persiapan pernikahan</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Budget tracker dasar (hingga 5 kategori)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hitung mundur hari-H & ringkasan mingguan</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Button
                variant="outline"
                fullWidth
                size="lg"
                onClick={() => onOpenAuth('signup')}
              >
                Mulai Gratis
              </Button>
            </div>
          </div>

          {/* Plan 2: Pro Wedding Pass */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-burgundy shadow-card flex flex-col justify-between relative transition-all duration-200 hover:shadow-card-hover">
            {/* Value Ribbon */}
            <div className="absolute -top-3.5 right-8 bg-burgundy text-white px-3.5 py-1 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-gold-300" />
              <span>Paling Populer</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-bold tracking-widest text-burgundy">
                  Pro Wedding Pass
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-burgundy-50 text-burgundy rounded-full border border-burgundy-100">
                  Sekali Bayar
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <h3 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
                  Rp149.000
                </h3>
                <span className="text-xs text-charcoal-400">/ per pernikahan</span>
              </div>
              <p className="text-xs text-charcoal-300 mt-1">
                Akses penuh sampai hari-H selesai.
              </p>

              <p className="text-sm text-charcoal-400 mt-4 pb-6 border-b border-beige leading-relaxed">
                Solusi lengkap dan tenang untuk pasangan yang mengurus seluruh persiapan mandiri.
              </p>

              <ul className="space-y-3 pt-6 text-sm text-charcoal-500">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-burgundy shrink-0" />
                  <span className="font-medium text-charcoal">Semua fitur pada paket Starter</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-burgundy shrink-0" />
                  <span>Sinkronisasi otomatis multi-akun berdua</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-burgundy shrink-0" />
                  <span>Pelacak termin DP & pelunasan vendor tanpa batas</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-burgundy shrink-0" />
                  <span>Next Best Action — rekomendasi cerdas mingguan</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => onOpenAuth('signup')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Pilih Pro Wedding
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
