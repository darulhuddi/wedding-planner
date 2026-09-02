import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ModulePlaceholderProps {
  moduleName: string;
  moduleCategory?: string;
  description?: string;
  onNavigateDashboard: () => void;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  moduleCategory = 'Fitur Workspace',
  description = 'Modul ini sedang disiapkan untuk rilis berikutnya. Seluruh data awalmu telah disimpan dengan aman di workspace.',
  onNavigateDashboard,
}) => {
  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between selection:bg-burgundy-100 selection:text-burgundy-900 pb-safe">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-beige py-3.5 px-4 sm:px-6 md:px-8">
        <div className="max-w-container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateDashboard}
              className="flex items-center gap-2 group cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-burgundy flex items-center justify-center text-ivory shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
                  <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
                </svg>
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
                Wed<span className="text-burgundy">Flow</span>
              </span>
            </button>
            <span className="h-4 w-px bg-beige-300 hidden sm:inline" />
            <span className="text-xs font-semibold text-charcoal-400 hidden sm:inline-block">
              {moduleCategory}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateDashboard}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            iconPosition="left"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </header>

      {/* Placeholder Main Body */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="max-w-md bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
              Modul {moduleCategory}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-1">
              {moduleName}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-charcoal-400 leading-relaxed">
            {description}
          </p>

          <div className="p-3 bg-ivory-50 rounded-xl border border-beige text-xs text-charcoal-500 font-medium">
            💡 WedFlow sedang mengembangkan tampilan penuh untuk modul {moduleName}.
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              fullWidth
              size="md"
              onClick={onNavigateDashboard}
              icon={<ArrowLeft className="w-4 h-4" />}
              iconPosition="left"
            >
              Kembali ke Dashboard Workspace
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-charcoal-300 border-t border-beige/40">
        <p>© 2026 WedFlow • Workspace Persiapan Pernikahan</p>
      </footer>

    </div>
  );
};
