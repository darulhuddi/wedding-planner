import React from 'react';
import { Quote } from 'lucide-react';

export const TestimonialSection: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 lg:py-32 border-t border-beige">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        
        {/* Transparent Demo Persona Label */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ivory-200 border border-beige text-charcoal-400 text-xs font-medium mb-8">
          <span>Demo Experience Preview</span>
        </div>

        {/* Quote Container */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 lg:p-14 border border-beige shadow-soft relative">
          <div className="w-11 h-11 rounded-full bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-6">
            <Quote className="w-5 h-5" />
          </div>

          <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl text-charcoal font-medium leading-snug max-w-2xl mx-auto mb-8">
            “Sekarang kami nggak perlu buka banyak spreadsheet untuk tahu apa yang harus diselesaikan.”
          </blockquote>

          <div className="flex flex-col items-center justify-center">
            <span className="text-base font-semibold text-charcoal">
              Pasangan Calon Pengantin
            </span>
            <span className="text-xs text-charcoal-400 mt-1">
              (Demo Persona — Persiapan Mandiri Jakarta)
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
