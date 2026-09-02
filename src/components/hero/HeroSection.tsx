import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { HeroDashboardPreview } from './HeroDashboardPreview';

export interface HeroSectionProps {
  onOpenAuth: (mode: 'signup' | 'login') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAuth }) => {
  const handleScrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.querySelector('#cara-kerja');
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative pt-24 pb-10 sm:pt-28 sm:pb-12 lg:pt-32 lg:pb-14 overflow-hidden">
      {/* Background subtle tint */}
      <div className="absolute top-0 left-0 right-0 h-[440px] bg-gradient-to-b from-beige-100/30 via-ivory-100/10 to-transparent -z-10 pointer-events-none" />

      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Mobile-First Layout: Stacked on mobile, 2-Column on Desktop (lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          
          {/* LEFT COLUMN: Editorial Typography & CTAs (lg: 5 cols) */}
          <div className="lg:col-span-5 text-left space-y-4 sm:space-y-5">
            {/* Subtle Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-600">
              <span className="h-px w-4 bg-gold"></span>
              <span>Workspace Pernikahan Indonesia</span>
            </div>

            {/* Fluid Editorial Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-semibold text-charcoal leading-[1.15] tracking-tight">
              Semua Persiapan <br />
              Pernikahanmu, <br />
              <span className="text-burgundy italic">Dalam Satu Alur.</span>
            </h1>

            {/* Supporting Paragraph */}
            <p className="text-sm sm:text-base text-charcoal-400 font-normal leading-relaxed max-w-md">
              Kelola budget, vendor, checklist, timeline, dan seluruh persiapan pernikahan dalam satu tempat.
            </p>

            {/* Refined CTAs - Mobile Full Width, Desktop Inline */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => onOpenAuth('signup')}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold shadow-sm"
              >
                Mulai Gratis
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleScrollToHowItWorks}
                className="w-full sm:w-auto px-5 py-3 text-sm font-medium"
              >
                Lihat Cara Kerja
              </Button>
            </div>

            {/* Close Reassurance */}
            <div className="flex items-center gap-1.5 text-xs text-charcoal-300 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>Tanpa kartu kredit.</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Mobile-First Legible WedFlow Dashboard (lg: 7 cols) */}
          <div className="lg:col-span-7 w-full">
            <HeroDashboardPreview />
          </div>

        </div>
      </div>
    </section>
  );
};
