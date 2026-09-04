import React from 'react';
import { RefreshCw, Menu } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenMobileNav?: () => void;
}

export function AdminHeader({
  title = 'Overview',
  subtitle = 'Pantau kesehatan dan aktivitas WedFlow.',
  onRefresh,
  isLoading = false,
  onOpenMobileNav,
}: AdminHeaderProps) {
  return (
    <header className="bg-ivory-50 border-b border-beige-200/80 px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              onClick={onOpenMobileNav}
              className="lg:hidden p-2 -ml-2 text-charcoal-600 hover:text-charcoal-900 rounded-lg hover:bg-beige-100 transition-colors"
              aria-label="Buka menu admin"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-charcoal-600 hover:text-charcoal-900 bg-white border border-beige-200 hover:border-beige-300 shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-burgundy-600' : ''}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
        )}
      </div>
    </header>
  );
}
