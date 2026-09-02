import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg bg-ivory rounded-t-3xl sm:rounded-3xl border-t sm:border border-beige shadow-modal max-h-[90dvh] overflow-y-auto pb-safe ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator / Grabber */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-charcoal-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 sm:pt-6 pb-3 border-b border-beige">
          <h3 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal truncate">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-ivory-200 text-charcoal-400 hover:text-charcoal flex items-center justify-center transition-colors min-h-touch min-w-touch"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
