import React, { useState } from 'react';
import {
  Home,
  CheckSquare,
  DollarSign,
  CalendarRange,
  MoreHorizontal,
  Layers,
  Users,
  BookOpen,
  Settings,
  FileText,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export interface MobileBottomNavProps {
  currentModule: string;
  onNavigate: (module: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentModule,
  onNavigate,
}) => {
  const { signOut } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const items = [
    { id: 'dashboard', label: 'Beranda', icon: <Home className="w-5 h-5" /> },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'budget', label: 'Budget', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'timeline', label: 'Timeline', icon: <CalendarRange className="w-5 h-5" /> },
    { id: 'more', label: 'Lainnya', icon: <MoreHorizontal className="w-5 h-5" /> },
  ];

  const secondaryModules = [
    {
      id: 'administration',
      label: 'Administrasi',
      description: 'Dokumen KUA, legalitas & syarat',
      icon: <FileText className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'vendor',
      label: 'Vendor',
      description: 'Kelola vendor & penawaran',
      icon: <Layers className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'guests',
      label: 'Tamu',
      description: 'Daftar tamu & RSVP',
      icon: <Users className="w-5 h-5 text-gold-600" />,
    },
    {
      id: 'notes',
      label: 'Catatan',
      description: 'Ide, rundown & informasi penting',
      icon: <BookOpen className="w-5 h-5 text-burgundy" />,
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      description: 'Akun, pernikahan & konteks',
      icon: <Settings className="w-5 h-5 text-gold-600" />,
    },
  ];

  const isSecondaryActive = ['vendor', 'guests', 'administration', 'administrasi', 'notes', 'settings'].includes(currentModule);

  const handleTabClick = (id: string) => {
    if (id === 'more') {
      setIsMoreOpen((prev) => !prev);
    } else {
      setIsMoreOpen(false);
      onNavigate(id);
    }
  };

  const handleSelectSecondary = (id: string) => {
    setIsMoreOpen(false);
    onNavigate(id);
  };

  return (
    <>
      {/* Secondary Menu Bottom Sheet Overlay */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Card Sheet (positioned above the bottom nav) */}
          <div
            className="fixed bottom-[64px] left-3 right-3 max-w-md mx-auto bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Lainnya"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-beige">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
                  Menu Tambahan
                </span>
                <h3 className="font-serif text-base font-bold text-charcoal">
                  Pilih Modul
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-charcoal-400 hover:text-charcoal hover:bg-beige-200/60 transition-colors cursor-pointer"
                aria-label="Tutup menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Modules List */}
            <div className="space-y-1.5">
              {secondaryModules.map((mod) => {
                const isSelected = currentModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleSelectSecondary(mod.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer min-h-touch ${
                      isSelected
                        ? 'bg-burgundy-50/80 border-burgundy-200 shadow-2xs'
                        : 'bg-ivory-50/70 border-beige hover:border-beige-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-white border-burgundy-200 shadow-2xs'
                            : 'bg-white border-beige'
                        }`}
                      >
                        {mod.icon}
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-xs sm:text-sm font-bold block ${
                            isSelected ? 'text-burgundy' : 'text-charcoal'
                          }`}
                        >
                          {mod.label}
                        </span>
                        <span className="text-[11px] text-charcoal-400 block truncate">
                          {mod.description}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-burgundy font-bold' : 'text-charcoal-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Logout Action in Mobile Sheet */}
            <div className="pt-2 border-t border-beige">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  signOut();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-beige bg-ivory-50/70 hover:bg-rose-50 hover:border-rose-200 text-left transition-all cursor-pointer min-h-touch"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-beige text-charcoal-400">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-charcoal block">
                      Keluar
                    </span>
                    <span className="text-[11px] text-charcoal-400 block truncate">
                      Keluar dari sesi akun
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-charcoal-300 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-beige shadow-soft py-1.5 px-2 pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {items.map((item) => {
            const isActive =
              item.id === 'more'
                ? isMoreOpen || isSecondaryActive
                : currentModule === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-h-touch min-w-touch ${
                  isActive
                    ? 'text-burgundy font-semibold'
                    : 'text-charcoal-400 hover:text-charcoal'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={item.id === 'more' ? isMoreOpen : undefined}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? 'bg-burgundy-50 text-burgundy' : ''
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
