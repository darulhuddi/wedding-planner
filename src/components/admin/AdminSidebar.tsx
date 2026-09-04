import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  KeyRound,
  CreditCard,
  Server,
  Settings,
  Shield,
  X,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { AdminNavRoute } from '../../types/admin';

interface AdminSidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  currentRoute,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const { user, signOut } = useAuth();

  const mainNavItems = [
    { id: 'admin', label: 'Overview', icon: LayoutDashboard },
    { id: 'admin/couples', label: 'Couples', icon: Users },
    { id: 'admin/weddings', label: 'Weddings', icon: Calendar },
    { id: 'admin/access', label: 'Access', icon: KeyRound },
    { id: 'admin/payments', label: 'Payments', icon: CreditCard },
  ];

  const systemNavItems = [
    { id: 'admin/system', label: 'System', icon: Server },
    { id: 'admin/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (itemId: string) => {
    if (itemId === 'admin' && (currentRoute === 'admin' || currentRoute === 'admin/overview')) {
      return true;
    }
    return currentRoute === itemId;
  };

  const handleSignOut = async () => {
    onCloseMobile?.();
    await signOut();
    onNavigate('home');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-charcoal-900 text-charcoal-100 border-r border-charcoal-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-charcoal-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-burgundy-700 flex items-center justify-center text-white font-serif font-bold text-lg tracking-wider shadow-sm">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif tracking-widest text-base font-bold text-ivory-50 uppercase">
                WedFlow
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider bg-burgundy-900/90 text-burgundy-200 px-1.5 py-0.5 rounded border border-burgundy-700/50">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-charcoal-400 font-sans tracking-tight">
              Control Center
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-charcoal-400 hover:text-white rounded hover:bg-charcoal-800 transition-colors"
            aria-label="Tutup navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        {/* Main Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-semibold">
            Management
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? 'bg-burgundy-800/70 text-white font-semibold shadow-inner border border-burgundy-600/40'
                      : 'text-charcoal-300 hover:text-white hover:bg-charcoal-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-burgundy-300' : 'text-charcoal-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-semibold">
            System
          </div>
          <nav className="space-y-1">
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? 'bg-burgundy-800/70 text-white font-semibold shadow-inner border border-burgundy-600/40'
                      : 'text-charcoal-300 hover:text-white hover:bg-charcoal-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-burgundy-300' : 'text-charcoal-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick link to consumer dashboard */}
        <div className="pt-2 border-t border-charcoal-800/60 px-3">
          <button
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile?.();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded text-xs text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/40 transition-colors cursor-pointer"
          >
            <span>Buka Consumer App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Operator Status Footer & Keluar (Logout) */}
      <div className="p-4 border-t border-charcoal-800/80 bg-charcoal-950/60 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-charcoal-800 border border-charcoal-700 flex items-center justify-center text-charcoal-300">
            <Shield className="w-4 h-4 text-burgundy-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ivory-50 truncate">
              {user?.email || 'Admin'}
            </div>
            <div className="text-[11px] text-charcoal-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Owner Access</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-charcoal-400 hover:text-rose-400 hover:bg-charcoal-800/60 transition-colors cursor-pointer text-left"
          title="Keluar dari Admin"
          aria-label="Keluar dari Admin"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs h-full z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
