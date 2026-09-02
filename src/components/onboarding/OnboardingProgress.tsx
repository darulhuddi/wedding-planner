import React from 'react';

export interface OnboardingProgressProps {
  currentStep: number; // 1 to 5
  totalSteps?: number; // default 5
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps = 5,
}) => {
  const percentage = Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);

  return (
    <div className="w-full max-w-xl mx-auto space-y-2 mb-6 sm:mb-8">
      <div className="flex items-center justify-between text-xs font-semibold text-charcoal-400">
        <span className="uppercase tracking-widest text-[11px] text-gold-600 font-bold">
          Langkah Setup
        </span>
        <span className="font-serif text-sm font-bold text-burgundy">
          {currentStep} <span className="text-charcoal-300 font-sans font-normal">/ {totalSteps}</span>
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-beige-200/80 h-2 rounded-full overflow-hidden p-0.5 border border-beige-300/40">
        <div
          className="bg-gradient-to-r from-burgundy to-burgundy-400 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
