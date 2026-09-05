import React, { useState } from 'react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import { PageHeader } from '../ui/PageHeader';
import { AccountSettings } from './AccountSettings';
import { WeddingSettings } from './WeddingSettings';
import { EventsSettings } from './EventsSettings';
import { ContextSettings } from './ContextSettings';
import { DataPrivacySettings } from './DataPrivacySettings';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { WeddingEvent } from '../../domain/events';
import { User, Heart, CalendarDays, Sparkles, SlidersHorizontal, ShieldAlert } from 'lucide-react';

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
  onResetPlanning?: () => Promise<void>;
  currentModule: string;
  onNavigateModule: (module: string) => void;
}

type SettingsTab = 'all' | 'account' | 'wedding' | 'events' | 'context' | 'privacy';

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
  onResetPlanning,
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
    { id: 'privacy', label: 'Data & Privasi', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop App Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate}
        workspaceId={workspace.id}
      />

      {/* Main Settings Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar */}
        <MobileModuleHeader
          onBack={() => onNavigateModule('dashboard')}
          title="Pengaturan"
          icon={<SlidersHorizontal className="w-4 h-4 text-burgundy" />}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-7">
          {/* Header Section */}
          <PageHeader
            eyebrow="Konfigurasi & Preferensi"
            title="Pengaturan"
            description="Kelola akun, profil pernikahan, acara, serta konteks keagamaan dan tradisi."
          />

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

            {/* Data & Privasi (Reset Perencanaan) */}
            {(activeTab === 'all' || activeTab === 'privacy') && (
              <DataPrivacySettings
                onResetPlanning={onResetPlanning || (async () => {})}
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
