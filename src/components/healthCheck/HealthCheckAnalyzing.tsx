import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { BrandMark } from '../brand';

export interface HealthCheckAnalyzingProps {
  onComplete: () => void;
}

const ANALYSIS_STEPS = [
  'Melihat progres persiapanmu…',
  'Mengecek kondisi timeline…',
  'Melihat posisi budget…',
  'Menentukan langkah yang paling penting…',
];

export const HealthCheckAnalyzing: React.FC<HealthCheckAnalyzingProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Step rotation every ~400ms
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 400);

    // Total analysis ~1.8s
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col items-center justify-center p-6 selection:bg-burgundy-100 selection:text-burgundy-900">
      <div className="w-full max-w-md bg-white rounded-3xl border border-beige-200 p-8 shadow-card text-center space-y-6">
        
        {/* Animated Brand Mark & Spinner */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-burgundy-50 border border-burgundy-200/60 flex items-center justify-center animate-pulse">
            <BrandMark size="lg" />
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-dashed border-burgundy/40 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-200/60 text-gold-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Planning Intelligence</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal tracking-tight">
            Menganalisis persiapan wedding kamu…
          </h2>
        </div>

        {/* Dynamic Rotating Step Message */}
        <div className="p-4 bg-ivory-50 rounded-2xl border border-beige-200/80 min-h-[72px] flex items-center justify-center">
          <p className="text-sm font-medium text-charcoal-600 transition-all duration-300 animate-fadeIn">
            {ANALYSIS_STEPS[currentStepIndex]}
          </p>
        </div>

        {/* Subtle Checkmark Progression */}
        <div className="flex justify-center items-center gap-2 text-xs text-charcoal-400">
          {ANALYSIS_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= currentStepIndex ? 'bg-burgundy' : 'bg-beige-300'
              }`}
            />
          ))}
        </div>

      </div>
    </div>
  );
};
