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

export interface NextBestAction {
  type: 'category' | 'budget' | 'checklist' | 'timeline' | 'task';
  category: CategoryId | null;
  taskId?: string; // Present when type is 'task'
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  source:
    | 'urgency'
    | 'user_priority'
    | 'sequence'
    | 'completion'
    | 'overdue'
    | 'due_today'
    | 'deadline'
    | 'priority';
  priorityTag: string;
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
