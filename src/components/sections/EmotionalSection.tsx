import React from 'react';

export const EmotionalSection: React.FC = () => {
  return (
    <section className="py-28 sm:py-36 lg:py-40 relative bg-ivory-200/40 border-y border-beige overflow-hidden">
      {/* Background Subtle Paper Texture */}
      <div className="absolute inset-0 bg-subtle-pattern pointer-events-none opacity-50" />

      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 relative text-center">
        
        {/* Subtle Ornamental Emblem */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white border border-beige-300 shadow-soft mb-8 text-burgundy">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="9" cy="12" r="5" stroke="#71343B" />
            <circle cx="15" cy="12" r="5" stroke="#B89A70" />
            <path d="M12 7v2" stroke="#B89A70" strokeLinecap="round" />
            <path d="M12 15v2" stroke="#B89A70" strokeLinecap="round" />
          </svg>
        </div>

        {/* Serif Headline with Emotional Rhythm */}
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-medium text-charcoal leading-[1.2] tracking-tight mb-8">
          Karena mempersiapkan pernikahan <br className="hidden sm:inline" />
          <span className="text-burgundy italic">bukan hanya tentang checklist.</span>
        </h2>

        {/* Calm Supporting Copy */}
        <p className="text-base sm:text-xl text-charcoal-400 font-normal leading-relaxed max-w-2xl mx-auto">
          Ada keputusan yang harus dibuat, uang yang harus diatur, vendor yang harus dipilih, dan ratusan hal kecil yang harus diselesaikan. WedFlow membantu merapikannya, supaya kamu bisa lebih menikmati perjalanan menuju hari-H.
        </p>

        {/* Abstract Planning Pillars */}
        <div className="mt-16 pt-12 border-t border-beige grid grid-cols-1 sm:grid-cols-3 gap-8 text-left max-w-3xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-beige shadow-2xs">
            <span className="text-xs uppercase font-semibold tracking-wider text-gold-600 block mb-1.5">
              Ketenangan Pikiran
            </span>
            <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed">
              Tidak ada lagi rasa cemas ada tagihan atau dokumen penting yang terlupa.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-beige shadow-2xs">
            <span className="text-xs uppercase font-semibold tracking-wider text-gold-600 block mb-1.5">
              Kolaborasi Harmonis
            </span>
            <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed">
              Bagi peran secara adil dan transparan bersama pasangan tanpa perdebatan.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-beige shadow-2xs">
            <span className="text-xs uppercase font-semibold tracking-wider text-gold-600 block mb-1.5">
              Momen Berharga
            </span>
            <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed">
              Nikmati masa tunangan dan persiapan dengan rasa bahagia dan percaya diri.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
