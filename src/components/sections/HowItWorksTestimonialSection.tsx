import React from 'react';
import { Sparkles, Sliders, CheckCircle2, Quote } from 'lucide-react';

export const HowItWorksTestimonialSection: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: <Sparkles className="w-4 h-4 text-burgundy" />,
      title: "Buat Wedding Plan",
      description: "Masukkan tanggal pernikahan dan detail dasar untuk menyusun alur otomatis."
    },
    {
      number: "02",
      icon: <Sliders className="w-4 h-4 text-burgundy" />,
      title: "Atur Persiapan",
      description: "Kelola budget, vendor, checklist, dan termin pembayaran di satu workspace."
    },
    {
      number: "03",
      icon: <CheckCircle2 className="w-4 h-4 text-burgundy" />,
      title: "Siap Menuju Hari-H",
      description: "Ikuti langkah mingguan berikutnya dan pantau progress sampai semua beres."
    }
  ];

  return (
    <section id="cara-kerja" className="py-14 sm:py-20 lg:py-22 bg-ivory-100/40 border-t border-beige">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT: How It Works Steps (lg: 6 cols) */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="h-px w-5 bg-gold"></span>
                <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
                  CARA KERJA
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal tracking-tight">
                Mulai dalam beberapa langkah.
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-400 mt-1.5 leading-relaxed">
                Tiga tahap sederhana untuk mengubah persiapan yang rumit menjadi alur teratur.
              </p>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-soft flex items-start gap-3.5 sm:gap-4 transition-all duration-200 hover:border-beige-300 hover:shadow-card"
                >
                  <div className="w-10 h-10 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-base sm:text-lg font-semibold text-charcoal truncate">
                        {step.title}
                      </h4>
                      <span className="text-sm font-bold font-serif text-burgundy/40 shrink-0">
                        {step.number}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-charcoal-400 mt-0.5 leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Social Proof / Testimonial Card (lg: 6 cols) */}
          <div className="lg:col-span-6 w-full">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 border border-beige-300 shadow-card flex flex-col justify-between relative">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-beige gap-2">
                <span className="text-xs sm:text-sm font-medium text-charcoal-400">
                  Dipercaya oleh pasangan yang sedang mempersiapkan hari mereka
                </span>
                <span className="text-[10px] sm:text-[11px] bg-ivory-100 text-charcoal-500 px-2.5 sm:px-3 py-1 rounded-full border border-beige shrink-0 font-medium">
                  Demo Preview
                </span>
              </div>

              {/* Quote Body */}
              <div className="space-y-3.5 sm:space-y-4">
                <div className="w-10 h-10 rounded-full bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy">
                  <Quote className="w-5 h-5" />
                </div>

                <blockquote className="font-serif text-lg sm:text-2xl text-charcoal font-medium leading-snug break-words">
                  “Sekarang kami nggak perlu buka banyak spreadsheet untuk tahu apa yang harus diselesaikan minggu ini.”
                </blockquote>
              </div>

              {/* Persona Footer */}
              <div className="mt-6 sm:mt-8 pt-4 border-t border-beige flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-charcoal block">
                    Pasangan Calon Pengantin
                  </span>
                  <span className="text-xs text-charcoal-400 mt-0.5 block">
                    Persiapan Mandiri — Jakarta
                  </span>
                </div>

                <div className="flex items-center gap-1 text-gold-500 text-xs">
                  <span>★★★★★</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
