export type PlanningPriority = 'budget' | 'checklist' | 'vendor' | 'timeline';

export type CategoryId = 'venue' | 'catering' | 'photography' | 'decoration' | 'makeup_attire' | 'invitation';

export interface OnboardingData {
  coupleName: string;
  weddingDate: string; // YYYY-MM-DD
  budget: number; // numeric IDR e.g. 100000000
  guestCount: number; // integer e.g. 400
  completedCategories: CategoryId[]; // e.g. ['venue', 'catering']
  primaryPlanningPriority: PlanningPriority | '';
  daysUntilWedding: number;
}

export type NextBestActionPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type NextBestActionType =
  | 'OPEN_WEDDING_IDENTITY'
  | 'OPEN_ADMINISTRATION_SETUP'
  | 'GENERATE_ADMIN_GUIDE'
  | 'OPEN_ADMIN_TASK'
  | 'OPEN_CHECKLIST_TASK'
  | 'OPEN_EVENTS'
  | 'OPEN_BUDGET'
  | 'OPEN_GUESTS'
  | 'OPEN_TIMELINE'
  | 'OPEN_CHECKLIST';

export interface NextBestAction {
  id?: string;
  type: 'category' | 'budget' | 'checklist' | 'timeline' | 'task' | 'administration' | 'identity' | 'events' | 'guests';
  category: CategoryId | null;
  taskId?: string; // Present when type is 'task'
  title: string;
  description: string;
  reason: string;
  priorityLevel?: NextBestActionPriority;
  priority: 'high' | 'medium' | 'low';
  source:
    | 'urgency'
    | 'user_priority'
    | 'sequence'
    | 'completion'
    | 'overdue'
    | 'due_today'
    | 'deadline'
    | 'priority'
    | 'blocker'
    | 'setup';
  priorityTag: string;
  actionType?: NextBestActionType;
  target?: string;
  ctaLabel?: string;
  metadata?: Record<string, unknown>;
}

// WeddingWorkspace has been removed.
// Use StoredWorkspace (persisted shape) and WorkspaceViewModel (derived UI shape)
// from src/types/workspace.ts instead.

export interface CategoryOption {
  id: CategoryId;
  label: string;
  description: string;
}

export interface PriorityOption {
  id: PlanningPriority;
  title: string;
  description: string;
  tag: string;
}
