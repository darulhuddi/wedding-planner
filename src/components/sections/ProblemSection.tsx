import React from 'react';
import { CreditCard, MessageSquareOff, ListX } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      icon: <CreditCard className="w-5 h-5 text-burgundy" />,
      tag: "Budget",
      title: "Banyak pengeluaran kecil yang sulit dilacak.",
      detail: "Termin DP, pelunasan bertahap, dan biaya printilan tak terduga yang tiba-tiba membengkak di luar rencana awal."
    },
    {
      icon: <MessageSquareOff className="w-5 h-5 text-burgundy" />,
      tag: "Vendor",
      title: "Chat, kontak, harga, dan pembayaran tersebar.",
      detail: "Proposal di WhatsApp, pricelist di email, dan bukti transfer di galeri foto membuat info penting mudah terselip."
    },
    {
      icon: <ListX className="w-5 h-5 text-burgundy" />,
      tag: "Checklist",
      title: "Terlalu banyak hal yang harus diingat.",
      detail: "Mulai dari berkas KUA, fitting baju, hingga souvenir, sulit menentukan mana yang harus didahulukan minggu ini."
    }
  ];

  return (
    <section className="py-14 sm:py-20 lg:py-22 relative bg-white">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <SectionHeader
          eyebrow="Tantangan Persiapan"
          title="Mempersiapkan pernikahan itu lebih kompleks dari yang terlihat."
          subtitle="Budget, vendor, deadline, pembayaran, dan ratusan hal kecil harus berjalan bersamaan. Tanpa sistem yang jelas, semuanya mudah tersebar dan terlupakan."
          align="center"
          className="mb-8 sm:mb-12"
        />

        {/* 3 Restrained Problem Cards with Clear Hierarchy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
          {problems.map((prob, idx) => (
            <div
              key={idx}
              className="bg-ivory-50/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige shadow-soft flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:bg-white"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                  <div className="w-10 h-10 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center shrink-0">
                    {prob.icon}
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-charcoal-400 bg-white px-2.5 py-0.5 rounded-full border border-beige">
                    {prob.tag}
                  </span>
                </div>

                <h3 className="font-serif text-lg sm:text-xl font-semibold text-charcoal mb-2 leading-snug break-words">
                  {prob.title}
                </h3>

                <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed font-normal">
                  {prob.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing Statement - Compact & Connected */}
        <div className="mt-8 sm:mt-12 text-center max-w-xl mx-auto pt-6 border-t border-beige/60">
          <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
            Dan semuanya harus selesai sebelum <span className="text-burgundy italic">hari-H.</span>
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-charcoal-400 leading-relaxed">
            WedFlow hadir untuk memberi alur yang tenang dan terkendali menuju momen terpentingmu.
          </p>
        </div>
      </div>
    </section>
  );
};
