import React from 'react';

export interface AuthLayoutProps {
  onNavigateHome: () => void;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  onNavigateHome,
  children,
}) => {
  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between selection:bg-burgundy-100 selection:text-burgundy-900 pb-safe">
      {/* Minimal Brand Header */}
      <header className="w-full border-b border-beige/80 py-4 sm:py-5 px-4 sm:px-6 md:px-8 bg-white/60 backdrop-blur-xs">
        <div className="max-w-container mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-none"
            aria-label="Kembali ke Beranda WedFlow"
          >
            <div className="w-7 h-7 rounded-lg bg-burgundy flex items-center justify-center text-ivory shadow-xs transition-transform group-hover:scale-105">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
                <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
              </svg>
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
              Wed<span className="text-burgundy">Flow</span>
            </span>
          </button>

          <button
            onClick={onNavigateHome}
            className="text-xs text-charcoal-400 hover:text-burgundy font-medium transition-colors cursor-pointer"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-charcoal-400 border-t border-beige/40">
        <p>© 2026 WedFlow • Workspace Persiapan Pernikahan Indonesia</p>
      </footer>
    </div>
  );
};
