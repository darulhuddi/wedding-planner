import { describe, it, expect } from 'vitest';
import { isWorkspaceOnboarded } from './workspaceSelectors';
import { StoredWorkspace } from '../types/workspace';

describe('isWorkspaceOnboarded Domain Selector', () => {
  const baseWorkspace: StoredWorkspace = {
    id: 'ws-123',
    userId: 'user-123',
    coupleName: 'Adit & Nisa',
    weddingDate: '2026-12-31',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 400,
    completedCategories: ['venue'],
    primaryPlanningPriority: 'checklist',
    religiousContexts: [],
    culturalContext: { hasTradition: null, description: null },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  it('returns true for a fully onboarded workspace with coupleName and weddingDate', () => {
    expect(isWorkspaceOnboarded(baseWorkspace)).toBe(true);
  });

  it('returns false if workspace is null or undefined', () => {
    expect(isWorkspaceOnboarded(null)).toBe(false);
    expect(isWorkspaceOnboarded(undefined)).toBe(false);
  });

  it('returns false for a reset workspace where coupleName is empty string', () => {
    const resetWorkspace: StoredWorkspace = {
      ...baseWorkspace,
      coupleName: '',
      weddingDate: '2026-12-31',
    };
    expect(isWorkspaceOnboarded(resetWorkspace)).toBe(false);
  });

  it('returns false for a reset workspace where weddingDate is empty string', () => {
    const resetWorkspace: StoredWorkspace = {
      ...baseWorkspace,
      coupleName: 'Adit & Nisa',
      weddingDate: '',
    };
    expect(isWorkspaceOnboarded(resetWorkspace)).toBe(false);
  });

  it('returns false for a reset workspace where both coupleName and weddingDate are empty/whitespace', () => {
    const resetWorkspace: StoredWorkspace = {
      ...baseWorkspace,
      coupleName: '   ',
      weddingDate: '   ',
    };
    expect(isWorkspaceOnboarded(resetWorkspace)).toBe(false);
  });
});
