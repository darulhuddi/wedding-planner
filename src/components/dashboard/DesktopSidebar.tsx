import React from 'react';
import { Home, CheckSquare, DollarSign, CalendarRange, Users, BookOpen, Layers, Settings, LogOut, Heart, Sparkles, ShieldCheck, FileText } from 'lucide-react';
import { BrandMark } from '../brand';
import { useAuth } from '../../auth/AuthContext';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import { useCustomerEntitlement } from '../../hooks/useCustomerEntitlement';

export interface DesktopSidebarProps {
  currentModule: string; // 'dashboard' | 'checklist' | 'administration' | 'budget' | 'timeline' | 'vendor' | 'guests' | 'notes' | 'settings'
  onNavigate: (module: string) => void;
  coupleName: string;
  weddingDate?: string;
  workspaceId?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentModule,
  onNavigate,
  coupleName,
  weddingDate,
  workspaceId,
}) => {
  const { signOut } = useAuth();
  const { isPaid, isExpired } = useCustomerEntitlement(workspaceId);

  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: <Home className="w-4 h-4" /> },
    { id: 'administration', label: 'Administrasi', icon: <FileText className="w-4 h-4" /> },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'budget', label: 'Budget', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'vendor', label: 'Vendor', icon: <Layers className="w-4 h-4" /> },
    { id: 'guests', label: 'Tamu', icon: <Users className="w-4 h-4" /> },
    { id: 'notes', label: 'Catatan', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const formattedDate = weddingDate ? formatIndonesianDate(weddingDate) : '';

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-beige min-h-screen sticky top-0 h-screen justify-between p-5 select-none">
      
      {/* Brand Header & Navigation */}
      <div className="space-y-6">
        
        {/* WedSiap Logo */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 px-2 group cursor-pointer text-left"
        >
          <BrandMark size="md" className="shrink-0" />
          <div>
            <span className="font-serif text-xl font-bold tracking-tight text-charcoal block leading-none">
              Wed<span className="text-burgundy">Siap</span>
            </span>
            <span className="text-[10px] text-charcoal-400 block mt-1 font-sans">
              Rencana Indah, Bersama
            </span>
          </div>
        </button>

        {/* Sidebar Nav Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer min-h-touch ${
                  isActive
                    ? 'bg-burgundy text-white font-semibold shadow-2xs'
                    : 'bg-transparent text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-200/80'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-charcoal-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* Bottom Simplified Wedding Identity & Account Control */}
      <div className="pt-4 border-t border-beige space-y-2">
        {/* Subtle Access Tier Affordance */}
        {isPaid ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold truncate">Wedding Pass Aktif</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('checkout')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-ivory-50 to-white hover:bg-ivory-100 border border-beige-300 hover:border-burgundy-200 transition-all cursor-pointer group"
            title="Beli Wedding Pass"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-gold-600 shrink-0" />
              <span className="text-xs font-semibold text-charcoal group-hover:text-burgundy truncate">
                Wedding Pass
              </span>
            </div>
            <span className="text-[10px] font-bold text-burgundy bg-white px-2 py-0.5 rounded border border-beige shrink-0">
              {isExpired ? 'Aktifkan' : 'Beli'}
            </span>
          </button>
        )}

        <div 
          onClick={() => onNavigate('settings')}
          className="bg-ivory-50 hover:bg-ivory-100 p-3 rounded-xl border border-beige flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white border border-beige flex items-center justify-center text-burgundy shrink-0">
              <Heart className="w-4 h-4 fill-burgundy" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-serif text-sm font-bold text-charcoal block truncate group-hover:text-burgundy transition-colors">
                {coupleName}
              </span>
              {formattedDate && (
                <span className="text-[11px] text-charcoal-400 block truncate">
                  {formattedDate}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('settings');
            }}
            className={`p-1 rounded-md text-charcoal-400 hover:text-burgundy hover:bg-white transition-colors cursor-pointer ${
              currentModule === 'settings' ? 'text-burgundy bg-white shadow-2xs' : ''
            }`}
            title="Pengaturan"
            aria-label="Pengaturan"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-charcoal-400 hover:text-burgundy hover:bg-ivory-100 transition-colors cursor-pointer min-h-touch text-left"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

    </aside>
  );
};
