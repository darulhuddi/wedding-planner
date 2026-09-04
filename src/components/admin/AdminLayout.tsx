import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: (openMobileNav: () => void) => React.ReactNode;
}

export function AdminLayout({
  currentRoute,
  onNavigate,
  children,
}: AdminLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <AdminSidebar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {children(() => setIsMobileNavOpen(true))}
      </div>
    </div>
  );
}
