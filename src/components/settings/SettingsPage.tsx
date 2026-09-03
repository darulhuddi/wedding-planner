import React, { useState } from 'react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { AccountSettings } from './AccountSettings';
import { WeddingSettings } from './WeddingSettings';
import { EventsSettings } from './EventsSettings';
import { ContextSettings } from './ContextSettings';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { WeddingEvent } from '../../domain/events';
import { User, Heart, CalendarDays, Sparkles } from 'lucide-react';

export interface SettingsPageProps {
  workspace: WorkspaceViewModel;
  storedWorkspace: StoredWorkspace;
  tasks: TaskItem[];
  events: WeddingEvent[];
  onWorkspaceChange: (updated: StoredWorkspace) => Promise<void> | void;
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  onEventCreate: (eventData: Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>) => Promise<void | WeddingEvent>;
  onEventUpdate: (eventId: string, changes: Partial<WeddingEvent>) => Promise<void | WeddingEvent>;
  onEventDelete: (eventId: string) => Promise<void>;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

type SettingsTab = 'all' | 'account' | 'wedding' | 'events' | 'context';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  workspace,
  storedWorkspace,
  tasks,
  events,
  onWorkspaceChange,
  onTaskChange,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  currentModule,
  onNavigateModule,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('all');

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Semua', icon: null },
    { id: 'account', label: 'Akun', icon: <User className="w-4 h-4" /> },
    { id: 'wedding', label: 'Pernikahan', icon: <Heart className="w-4 h-4" /> },
    { id: 'events', label: 'Acara', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'context', label: 'Konteks & Tradisi', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop App Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
      />

      {/* Main Settings Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-burgundy flex items-center justify-center text-ivory">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
                <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
              </svg>
            </div>
            <span className="font-serif text-lg font-bold text-charcoal">
              Wed<span className="text-burgundy">Flow</span>
            </span>
          </div>

          <span className="text-[10px] font-semibold text-burgundy bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-100">
            Pengaturan
          </span>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-7">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-beige pb-4 sm:pb-6">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-gold-600 block">
                Konfigurasi & Preferensi
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-0.5">
                Pengaturan
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-400 mt-1">
                Kelola akun, profil pernikahan, acara, serta konteks keagamaan dan tradisi.
              </p>
            </div>
          </div>

          {/* Tab Navigation Filter (on desktop and tablet for quick jumping) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-burgundy text-white font-semibold shadow-2xs'
                      : 'bg-white border border-beige text-charcoal hover:bg-ivory-100 hover:border-beige-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section Container */}
          <div className="space-y-6">
            {/* Akun */}
            {(activeTab === 'all' || activeTab === 'account') && (
              <AccountSettings onNavigateLogin={() => onNavigateModule('login')} />
            )}

            {/* Informasi Pernikahan */}
            {(activeTab === 'all' || activeTab === 'wedding') && (
              <WeddingSettings
                storedWorkspace={storedWorkspace}
                onWorkspaceChange={onWorkspaceChange}
              />
            )}

            {/* Acara Pernikahan */}
            {(activeTab === 'all' || activeTab === 'events') && (
              <EventsSettings
                events={events}
                onEventCreate={onEventCreate}
                onEventUpdate={onEventUpdate}
                onEventDelete={onEventDelete}
              />
            )}

            {/* Konteks Keagamaan & Tradisi */}
            {(activeTab === 'all' || activeTab === 'context') && (
              <ContextSettings
                storedWorkspace={storedWorkspace}
                onWorkspaceChange={onWorkspaceChange}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentModule={currentModule} onNavigate={onNavigateModule} />
    </div>
  );
};
