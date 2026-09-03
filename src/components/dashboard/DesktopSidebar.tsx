import React from 'react';
import { Home, CheckSquare, DollarSign, CalendarRange, Users, BookOpen, Layers, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export interface DesktopSidebarProps {
  currentModule: string; // 'dashboard' | 'checklist' | 'budget' | 'timeline' | 'vendor' | 'guests' | 'notes' | 'settings'
  onNavigate: (module: string) => void;
  coupleName: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentModule,
  onNavigate,
  coupleName,
}) => {
  const { signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: <Home className="w-4 h-4" /> },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'budget', label: 'Budget', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'vendor', label: 'Vendor', icon: <Layers className="w-4 h-4" /> },
    { id: 'guests', label: 'Tamu', icon: <Users className="w-4 h-4" /> },
    { id: 'notes', label: 'Catatan', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-beige min-h-screen sticky top-0 h-screen justify-between p-5 select-none">
      
      {/* Brand Header & Navigation */}
      <div className="space-y-6">
        
        {/* WedFlow Logo */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 px-2 group cursor-pointer text-left"
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

        {/* Sidebar Nav Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer min-h-touch ${
                  isActive
                    ? 'bg-burgundy text-white font-semibold shadow-2xs'
                    : 'text-charcoal-400 hover:text-charcoal hover:bg-ivory-100'
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

      {/* Bottom Workspace Context & Account Control */}
      <div className="pt-4 border-t border-beige space-y-2">
        <div className="bg-ivory-50 p-3 rounded-xl border border-beige">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gold-600 tracking-wider block">
              Workspace Aktif
            </span>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`p-1 rounded-md text-charcoal-400 hover:text-burgundy hover:bg-white transition-colors cursor-pointer ${
                currentModule === 'settings' ? 'text-burgundy bg-white shadow-2xs' : ''
              }`}
              title="Pengaturan"
              aria-label="Pengaturan"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="font-serif text-sm font-bold text-charcoal block truncate mt-1">
            {coupleName}
          </span>
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
