/**
 * WedFlow Phase 2: Template & Recommendation Types
 *
 * Provides types for:
 * - Static task template metadata
 * - Timing windows
 * - Recommendation input and output
 */

import { TaskCategoryId, TaskPriority } from '../types/checklist';
import { EventType, WeddingEvent } from './events';
import { ReligiousTradition } from './context';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { CategoryId } from '../types/onboarding';

export type TemplateApplicability = 'core' | 'optional' | 'conditional';

export interface RecommendedWindow {
  /** Minimum days before wedding (closest boundary, e.g. 90 days before) */
  minDaysBeforeWedding: number;
  /** Maximum days before wedding (earliest ideal start, e.g. 180 days before) */
  maxDaysBeforeWedding: number;
}

export interface StarterTaskTemplate {
  id: string;
  category: TaskCategoryId;
  title: string;
  description: string;
  sequence: number; // 1..7 sequence in category
  applicableEvents: EventType[];
  applicability: TemplateApplicability;
  recommendedWindow: RecommendedWindow;
  priority: TaskPriority;
  isStarterCandidate: boolean;
  isCatchUpCandidate: boolean;
  prerequisites: string[]; // IDs of preceding templates in this sequence
  skipConditions?: {
    completedCategory?: CategoryId;
    requiresTradition?: boolean;
  };
  estimatedMinutes: number | null;
  contextRequirements?: {
    traditions?: ReligiousTradition[];
    requiresCulturalTradition?: boolean;
    eventTypes?: EventType[];
  };
}

export interface StarterRecommendation {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: TaskCategoryId;
  eventIds: string[];
  priority: TaskPriority;
  suggestedDueDate: string | null; // YYYY-MM-DD
  reason: string;
  mode: 'normal' | 'catch_up';
  source: string;
}

export interface StarterRecommendationInput {
  workspace: StoredWorkspace;
  tasks: TaskItem[];
  events: WeddingEvent[];
  today?: string; // YYYY-MM-DD
}
