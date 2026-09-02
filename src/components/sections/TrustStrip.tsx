import React from 'react';
import { Layers, Compass, HeartHandshake } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const benefits = [
    {
      icon: <Layers className="w-5 h-5 text-burgundy" />,
      title: "Semua dalam satu tempat",
      description: "Checklist, budget, vendor, dan timeline terintegrasi tanpa ribet."
    },
    {
      icon: <Compass className="w-5 h-5 text-burgundy" />,
      title: "Tahu apa yang harus dilakukan",
      description: "Prioritas mingguan yang jelas untuk menghilangkan rasa bingung."
    },
    {
      icon: <HeartHandshake className="w-5 h-5 text-burgundy" />,
      title: "Dibuat untuk pasangan Indonesia",
      description: "Sesuai sistem termin DP, vendor lokal, dan tahapan adat."
    }
  ];

  return (
    <section className="py-6 sm:py-8 border-y border-beige bg-ivory-100/60">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-6">
          {benefits.map((item, index) => (
            <div
              key={index}
              className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-beige shadow-2xs flex items-center gap-3.5 transition-all duration-200 hover:border-beige-300 hover:shadow-soft"
            >
              <div className="w-10 h-10 rounded-xl bg-burgundy-50 border border-burgundy-100/80 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-charcoal">
                  {item.title}
                </h3>
                <p className="text-xs text-charcoal-400 leading-snug font-normal mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
