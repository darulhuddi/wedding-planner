import React from 'react';
import { OnboardingProgress } from './OnboardingProgress';
import { BrandMark } from '../brand';

export interface OnboardingLayoutProps {
  currentStep: number; // 1 to 6
  totalSteps?: number; // 5
  onNavigateHome: () => void;
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  totalSteps = 5,
  onNavigateHome,
  children,
}) => {
  const isCompletionScreen = currentStep > totalSteps;

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between selection:bg-burgundy-100 selection:text-burgundy-900 pb-safe">
      
      {/* Minimal Brand Header */}
      <header className="w-full border-b border-beige/80 py-4 sm:py-5 px-4 sm:px-6 md:px-8 bg-white/60 backdrop-blur-xs">
        <div className="max-w-container mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-none"
            aria-label="Kembali ke Beranda WedSiap"
          >
            <BrandMark size="md" className="shadow-xs transition-transform group-hover:scale-105" />
            <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
              Wed<span className="text-burgundy">Siap</span>
            </span>
          </button>

          <span className="text-xs text-charcoal-400 font-medium">
            Setup Workspace
          </span>
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-xl mx-auto">
          {/* Step Progress Indicator (Hidden on Screen 6 / Completion) */}
          {!isCompletionScreen && (
            <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />
          )}

          {/* Screen Content */}
          <div className="animate-fadeIn">
            {children}
          </div>
        </div>
      </main>

      {/* Minimal Footer Reassurance */}
      <footer className="w-full py-4 text-center text-xs text-charcoal-300 border-t border-beige/40">
        <p>© 2026 WedSiap • Workspace Persiapan Pernikahan Indonesia</p>
      </footer>

    </div>
  );
};
