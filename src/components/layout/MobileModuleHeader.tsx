import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface MobileModuleHeaderProps {
  title: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const MobileModuleHeader: React.FC<MobileModuleHeaderProps> = ({
  title,
  icon,
  onBack,
  rightAction,
}) => {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 -ml-1 text-charcoal-400 hover:text-charcoal transition-colors cursor-pointer rounded-lg hover:bg-ivory-100"
            aria-label="Kembali ke Beranda"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          {icon && <span className="text-burgundy shrink-0">{icon}</span>}
          <span className="font-serif text-base font-bold text-charcoal">{title}</span>
        </div>
      </div>
      <div>
        {rightAction || <div className="w-8" />}
      </div>
    </header>
  );
};
