/**
 * WedFlow Marriage Administration Domain Types (V1)
 *
 * Focus: Islamic Marriage Administration via KUA & SIMKAH in Indonesia.
 * Legal Basis: PMA No. 30 Tahun 2024, UU No. 16 Tahun 2019, PP No. 59 Tahun 2018.
 *
 * Principles:
 * - Pure TypeScript types.
 * - Single source of truth for birth date (pure age derivation).
 * - Distinct requirement levels and source metadata.
 * - Risk-aware and deadline-aware.
 * - Zero document upload / zero parallel database.
 */

export type GroomMaritalStatus = 'single' | 'divorced_alive' | 'widowed' | 'polygamy_married';
export type BrideMaritalStatus = 'single' | 'divorced_alive' | 'widowed';
export type CitizenshipType = 'wni' | 'wna';
export type ServiceStatus = 'civilian' | 'tni_polri';

export type AgeLegalCategory = 'under_19' | 'between_19_and_21' | 'adult_21_plus';

export type RequirementLevel =
  | 'NATIONAL_REQUIREMENT'
  | 'LOCAL_SERVICE_PRACTICE'
  | 'CONFIRM_WITH_KUA'
  | 'WEDFLOW_PLANNING_RECOMMENDATION';

export type SourceType =
  | 'REGULATION'
  | 'KEMENAG'
  | 'LOCAL_KUA'
  | 'WEDFLOW_RECOMMENDATION';

export interface AdministrativeTaskMetadata {
  requirementLevel: RequirementLevel;
  sourceType: SourceType;
  sourceReference: string;
  lastVerifiedAt: string;
  explanation: string;
  practicalTips?: string;
}

export type AdministrativeStage =
  | 'documents'     // 1. Dokumen Identitas & Medis Pribadi
  | 'jurisdiction'  // 2. Pengurusan Kelurahan & Rekomendasi KUA Asal
  | 'registration'  // 3. Pendaftaran SIMKAH & Pembayaran PNBP
  | 'examination';  // 4. Pemeriksaan Berkas (Rapak) & Bimbingan (Bimwin)

export interface PersonAdminProfile {
  birthDate: string | null;           // YYYY-MM-DD (Single Source of Truth)
  maritalStatus: GroomMaritalStatus | BrideMaritalStatus;
  citizenship: CitizenshipType;
  serviceStatus: ServiceStatus;
  isSameKuaDistrictAsCeremony: boolean;
}

export interface StoredAdministrationContext {
  groom: PersonAdminProfile;
  bride: PersonAdminProfile;
  hasSpecialWaliCase: boolean;
  isSetupCompleted: boolean;
  updatedAt: string;
}

export type PnbpAssessmentStatus =
  | 'ZERO_AT_KUA_OFFICE_HOURS'
  | 'STANDARD_OUTSIDE_OR_WEEKEND'
  | 'SPECIAL_WAIVER_POSSIBLE'
  | 'CONFIRM_WITH_KUA';

export type AdministrativeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AdministrativeRiskAssessment {
  level: AdministrativeRiskLevel;
  label: string;
  reasons: string[];
}

export interface DerivedAdministrativeProperties {
  groomAgeAtCeremony: number | null;
  brideAgeAtCeremony: number | null;
  groomAgeCategory: AgeLegalCategory;
  brideAgeCategory: AgeLegalCategory;
  pnbpAssessment: PnbpAssessmentStatus;
  estimatedPnbpAmount: number; // 0 or 600000
  legalDeadlineDate: string | null;     // YYYY-MM-DD (H-10 Hari Kerja)
  planningTargetDate: string | null;    // YYYY-MM-DD (H-35 Hari Kalender)
  remainingWorkingDays: number | null;
  riskAssessment: AdministrativeRiskAssessment;
  completionPercentage: number;
}
