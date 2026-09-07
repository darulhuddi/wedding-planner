/**
 * WedSiap Wedding Health Check - Anonymous Persistence Helper
 *
 * Provides safe client-side persistence for temporary assessments before registration.
 * Supports transparent migration from legacy storage keys (wedflow_*) to canonical brand keys (wedsiap_*).
 */

import { PersistedHealthCheckAssessment } from './types';
import {
  HEALTH_CHECK_ASSESSMENT_STORAGE_KEY,
  HEALTH_CHECK_LEGACY_STORAGE_KEY,
} from './conversion';

/**
 * Saves a persisted assessment to browser local storage under the canonical brand key.
 */
export function savePendingAssessment(assessment: PersistedHealthCheckAssessment): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY, JSON.stringify(assessment));
  } catch (error) {
    console.error('[HealthCheck] Failed to save pending assessment to localStorage:', error);
  }
}

/**
 * Retrieves the pending assessment from local storage.
 * Automatically falls back to and migrates from legacy storage keys if present.
 */
export function getPendingAssessment(): PersistedHealthCheckAssessment | null {
  try {
    if (typeof localStorage === 'undefined') return null;

    // 1. Try canonical brand key
    let raw = localStorage.getItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY);
    let fromLegacy = false;

    // 2. Fallback to legacy key
    if (!raw) {
      raw = localStorage.getItem(HEALTH_CHECK_LEGACY_STORAGE_KEY);
      if (raw) fromLegacy = true;
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedHealthCheckAssessment;
    if (!parsed || !parsed.input || !parsed.version) {
      return null;
    }

    // 3. Migrate legacy payload to new canonical key
    if (fromLegacy) {
      try {
        localStorage.setItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY, JSON.stringify(parsed));
        localStorage.removeItem(HEALTH_CHECK_LEGACY_STORAGE_KEY);
      } catch (migrateErr) {
        console.warn('[HealthCheck] Failed to migrate legacy assessment key:', migrateErr);
      }
    }

    return parsed;
  } catch (error) {
    console.error('[HealthCheck] Failed to parse pending assessment from localStorage:', error);
    return null;
  }
}

/**
 * Removes the pending assessment from local storage across both canonical and legacy keys.
 */
export function clearPendingAssessment(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY);
    localStorage.removeItem(HEALTH_CHECK_LEGACY_STORAGE_KEY);
  } catch (error) {
    console.error('[HealthCheck] Failed to clear pending assessment from localStorage:', error);
  }
}

/**
 * Checks if a pending assessment is available in local storage.
 */
export function hasPendingAssessment(): boolean {
  return getPendingAssessment() !== null;
}
