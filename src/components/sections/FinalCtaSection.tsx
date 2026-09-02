import React from 'react';
import { ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export interface FinalCtaSectionProps {
  onOpenAuth: (mode: 'signup' | 'login') => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenAuth }) => {
  return (
    <section className="bg-burgundy text-ivory py-14 sm:py-20 lg:py-22 relative overflow-hidden">
      {/* Subtle gold glow & dark burgundy depth */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-burgundy-900/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative text-center">
        
        {/* Subtle Icon */}
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-ivory mx-auto mb-5 sm:mb-6 shadow-inner">
          <Heart className="w-6 h-6 fill-ivory/20" />
        </div>

        {/* Scaled Confident Headline */}
        <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-semibold text-ivory leading-[1.16] tracking-tight mb-3.5 sm:mb-4">
          Pernikahanmu sudah cukup rumit. <br className="hidden sm:inline" />
          <span className="text-gold-200 italic">Perencanaannya tidak perlu.</span>
        </h2>

        {/* Supporting Copy */}
        <p className="text-sm sm:text-base md:text-lg text-ivory-200/90 font-normal leading-relaxed max-w-lg mx-auto mb-6 sm:mb-8">
          Mulai atur semuanya dalam satu tempat.
        </p>

        {/* CTA button with touch standard */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-ivory text-burgundy font-semibold text-sm sm:text-base rounded-xl hover:bg-white active:bg-ivory-200 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer min-h-touch"
          >
            <span>Mulai Gratis Sekarang</span>
            <ArrowRight className="w-4 h-4 text-burgundy" />
          </button>
        </div>

        {/* Reassurance text */}
        <div className="mt-4 sm:mt-5 flex items-center justify-center gap-1.5 text-xs text-ivory-300">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-300 shrink-0" />
          <span>Tanpa kartu kredit. Siap pakai dalam 1 menit.</span>
        </div>

      </div>
    </section>
  );
};
