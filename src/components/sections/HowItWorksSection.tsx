import React from 'react';
import { Sparkles, Sliders, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: <Sparkles className="w-5 h-5 text-burgundy" />,
      title: "Buat Wedding Plan",
      description: "Masukkan tanggal pernikahan dan detail dasar.",
      subtext: "Dapatkan timeline otomatis yang disesuaikan dengan waktu tersisa menuju hari-H."
    },
    {
      number: "02",
      icon: <Sliders className="w-5 h-5 text-burgundy" />,
      title: "Atur Persiapan",
      description: "Kelola budget, vendor, checklist, dan timeline.",
      subtext: "Semua pengeluaran, kontak vendor, dan pembagian tugas tersimpan rapi di satu workspace."
    },
    {
      number: "03",
      icon: <CheckCircle2 className="w-5 h-5 text-burgundy" />,
      title: "Siap Menuju Hari-H",
      description: "Ikuti langkah berikutnya dan pantau progress sampai semuanya siap.",
      subtext: "Cukup fokus pada aksi mingguan tanpa perlu pusing memikirkan semuanya sekaligus."
    }
  ];

  return (
    <section id="cara-kerja" className="py-24 sm:py-32 lg:py-36">
      <div className="max-w-container mx-auto px-6 sm:px-8 lg:px-12">
        <SectionHeader
          eyebrow="Cara Kerja"
          title="Mulai dalam beberapa langkah."
          subtitle="Tiga tahap mudah untuk mengubah persiapan pernikahan yang rumit menjadi alur yang teratur."
          align="center"
          className="mb-16 sm:mb-20"
        />

        {/* 3 Step Simple Visual Progression */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-5xl mx-auto">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-8 border border-beige shadow-soft flex flex-col justify-between transition-all duration-300 hover:shadow-card hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="font-serif text-3xl font-bold text-burgundy/20">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-semibold text-charcoal mb-2">
                  {step.title}
                </h3>

                <p className="text-sm sm:text-base font-medium text-charcoal-500 mb-2 leading-snug">
                  {step.description}
                </p>

                <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed font-normal">
                  {step.subtext}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-beige-100 flex items-center text-xs font-semibold text-burgundy">
                <span>Tahap {step.number}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
