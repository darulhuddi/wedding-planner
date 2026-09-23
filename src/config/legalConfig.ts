/**
 * WedSiap Centralized Legal & Regulatory Configuration
 *
 * Provides configurable legal entity details and contact emails.
 * Supports environment variables via Vite (`import.meta.env`) with safe, production-ready fallbacks.
 */

export interface LegalConfig {
  legalEntityName: string;
  legalEntityAddress: string;
  legalContactEmail: string;
  privacyEmail: string;
  termsEffectiveDate: string;
  websiteUrl: string;
}

export const legalConfig: LegalConfig = {
  legalEntityName:
    (import.meta.env.VITE_LEGAL_ENTITY_NAME as string) || '[LEGAL ENTITY NAME]',
  legalEntityAddress:
    (import.meta.env.VITE_LEGAL_ENTITY_ADDRESS as string) || '[BUSINESS ADDRESS]',
  legalContactEmail:
    (import.meta.env.VITE_LEGAL_CONTACT_EMAIL as string) || 'support@wedflow.id',
  privacyEmail:
    (import.meta.env.VITE_PRIVACY_EMAIL as string) || 'privacy@wedflow.id',
  termsEffectiveDate:
    (import.meta.env.VITE_TERMS_EFFECTIVE_DATE as string) || '23 September 2026',
  websiteUrl:
    (import.meta.env.VITE_WEBSITE_URL as string) || 'https://wedsiap.id',
};
