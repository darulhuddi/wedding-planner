import React from 'react';
import { LayoutDashboard, CheckSquare, Wallet, CalendarRange, Users, Users2, FileText, Settings, Heart } from 'lucide-react';

export interface DesktopSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  coupleName?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab = 'overview',
  onTabChange,
  coupleName = 'Adit & Nisa',
}) => {
  const primaryNav = [
    { id: 'overview', label: 'Wedding Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'budget', label: 'Budget & Pembayaran', icon: <Wallet className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline & Rundown', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'vendors', label: 'Vendor Directory', icon: <Users className="w-4 h-4" /> },
  ];

  const secondaryNav = [
    { id: 'guests', label: 'Daftar Tamu (RSVP)', icon: <Users2 className="w-4 h-4" /> },
    { id: 'notes', label: 'Catatan & Inspirasi', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Pengaturan Akun', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-beige p-6 justify-between shrink-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-lg bg-burgundy flex items-center justify-center text-ivory">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
              <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
            </svg>
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
            Wed<span className="text-burgundy">Flow</span>
          </span>
        </div>

        {/* Couple Plan Badge */}
        <div className="bg-ivory-100 p-3 rounded-xl border border-beige flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
            <Heart className="w-4 h-4 fill-burgundy" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal truncate block">{coupleName}</span>
            <span className="text-[10px] text-charcoal-400">14 Feb 2027</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 tracking-wider px-3 mb-2 block">
            Workspace
          </span>
          {primaryNav.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-burgundy text-white font-semibold shadow-2xs'
                    : 'text-charcoal-500 hover:bg-ivory-100 hover:text-charcoal'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1 pt-3 border-t border-beige">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 tracking-wider px-3 mb-2 block">
            Pengaturan
          </span>
          {secondaryNav.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-burgundy text-white font-semibold'
                    : 'text-charcoal-500 hover:bg-ivory-100 hover:text-charcoal'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
