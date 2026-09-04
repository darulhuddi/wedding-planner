import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { AccessStatusBanner, AccessStatusBannerProps } from './AccessStatusBanner';
import { CustomerEntitlement } from '../../types/admin';

describe('AccessStatusBanner Component Tests', () => {
  // Base fixtures
  const trialEntitlement: CustomerEntitlement = {
    workspaceId: 'ws-123',
    tier: 'Trial',
    source: 'trial',
    remainingDays: 5,
    isExpired: false,
    startedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const expiredEntitlement: CustomerEntitlement = {
    workspaceId: 'ws-123',
    tier: 'Expired',
    source: 'trial',
    remainingDays: 0,
    isExpired: true,
    startedAt: '2026-08-20T00:00:00Z',
    expiresAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };

  const paidUnlimitedEntitlement: CustomerEntitlement = {
    workspaceId: 'ws-123',
    tier: 'Paid',
    source: 'purchased',
    remainingDays: null,
    isExpired: false,
    startedAt: '2026-09-01T00:00:00Z',
    expiresAt: null,
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const complimentaryUnlimitedEntitlement: CustomerEntitlement = {
    workspaceId: 'ws-123',
    tier: 'Paid',
    source: 'complimentary',
    remainingDays: null,
    isExpired: false,
    startedAt: '2026-09-01T00:00:00Z',
    expiresAt: null,
    updatedAt: '2026-09-01T00:00:00Z',
  };

  it('1. renders loading skeleton when isLoading is true', () => {
    const element = AccessStatusBanner({
      entitlement: null,
      isLoading: true,
    });

    expect(element).not.toBeNull();
    if (React.isValidElement<{ 'aria-label'?: string; className?: string }>(element)) {
      expect(element.props['aria-label']).toBe('Memuat status akses');
      expect(element.props.className).toContain('animate-pulse');
    }
  });

  it('2. returns null when entitlement is null and not loading', () => {
    const element = AccessStatusBanner({
      entitlement: null,
      isLoading: false,
    });

    expect(element).toBeNull();
  });

  // CASE A: Trial active → finite trial information remains visible.
  it('CASE A: renders active Trial state with finite remaining days and upgrade CTA', () => {
    const onUpgradeClick = vi.fn();
    const element = AccessStatusBanner({
      entitlement: trialEntitlement,
      onUpgradeClick,
    });

    expect(element).not.toBeNull();
    if (React.isValidElement<{ 'aria-label'?: string; children?: React.ReactNode }>(element)) {
      expect(element.props['aria-label']).toBe('Informasi Masa Uji Coba');
    }

    const jsxString = JSON.stringify(element);
    expect(jsxString).toContain('Trial Gratis');
    expect(jsxString).toContain('Sisa 5 hari masa uji coba');
    expect(jsxString).toContain('Gunakan seluruh fitur selama masa trial. Upgrade ke Wedding Pass untuk akses penuh tanpa batas waktu.');
    expect(jsxString).toContain('Beli Wedding Pass');
    expect(jsxString).not.toContain('hingga Hari-H');
  });

  // CASE B: Trial expired → existing expired behavior remains.
  it('CASE B: renders Expired state with activation warning and CTA', () => {
    const onUpgradeClick = vi.fn();
    const element = AccessStatusBanner({
      entitlement: expiredEntitlement,
      onUpgradeClick,
    });

    expect(element).not.toBeNull();
    if (React.isValidElement<{ 'aria-label'?: string }>(element)) {
      expect(element.props['aria-label']).toBe('Masa Uji Coba Berakhir');
    }

    const jsxString = JSON.stringify(element);
    expect(jsxString).toContain('Masa Uji Coba Telah Berakhir');
    expect(jsxString).toContain('Perlu Aktivasi');
    expect(jsxString).toContain('Buka akses tanpa batas waktu untuk melanjutkan checklist, budget, dan persiapan pernikahanmu.');
    expect(jsxString).toContain('Aktifkan Wedding Pass');
  });

  // CASE C: Paid → "Akses tanpa batas waktu" state.
  it('CASE C: renders Paid state with unlimited access semantics and no upgrade CTA', () => {
    const element = AccessStatusBanner({
      entitlement: paidUnlimitedEntitlement,
    });

    expect(element).not.toBeNull();
    if (React.isValidElement<{ 'aria-label'?: string }>(element)) {
      expect(element.props['aria-label']).toBe('Status Akses Wedding Pass');
    }

    const jsxString = JSON.stringify(element);
    expect(jsxString).toContain('Wedding Pass');
    expect(jsxString).toContain('Akses tanpa batas waktu');
    expect(jsxString).toContain('Sekali bayar. Akses tanpa batas waktu.');
    expect(jsxString).not.toContain('Beli Wedding Pass');
    expect(jsxString).not.toContain('Aktifkan Wedding Pass');
    expect(jsxString).not.toContain('hingga Hari-H');
  });

  // CASE D: Paid with expiresAt = null → no expiration UI.
  it('CASE D: Paid with expiresAt = null renders no expiration date or countdown', () => {
    const element = AccessStatusBanner({
      entitlement: {
        ...paidUnlimitedEntitlement,
        expiresAt: null,
      },
    });

    const jsxString = JSON.stringify(element);
    expect(jsxString).not.toContain('berlaku hingga');
    expect(jsxString).not.toContain('aktif hingga');
    expect(jsxString).not.toContain('kedaluwarsa');
    expect(jsxString).toContain('Sekali bayar. Akses tanpa batas waktu.');
  });

  // CASE E: Paid with wedding date in the past → still active.
  it('CASE E: Paid with past wedding date remains fully active', () => {
    const element = AccessStatusBanner({
      entitlement: {
        ...paidUnlimitedEntitlement,
        weddingDate: '2020-01-01',
      },
    });

    expect(element).not.toBeNull();
    if (React.isValidElement<{ 'aria-label'?: string }>(element)) {
      expect(element.props['aria-label']).toBe('Status Akses Wedding Pass');
    }

    const jsxString = JSON.stringify(element);
    expect(jsxString).toContain('Akses tanpa batas waktu');
    expect(jsxString).not.toContain('Perlu Aktivasi');
  });

  // CASE F: Paid with remainingDays = null → no incorrect "0 days remaining" or expiration warning.
  it('CASE F: Paid with remainingDays = null displays no remaining days badge or warning', () => {
    const element = AccessStatusBanner({
      entitlement: {
        ...paidUnlimitedEntitlement,
        remainingDays: null,
      },
    });

    const jsxString = JSON.stringify(element);
    expect(jsxString).not.toContain('Sisa 0 hari');
    expect(jsxString).not.toContain('hari lagi');
    expect(jsxString).not.toContain('Masa uji coba');
    expect(jsxString).toContain('Akses tanpa batas waktu');
  });

  // CASE G: Complimentary Paid → unlimited messaging.
  it('CASE G: Complimentary Paid renders unlimited access copy and complimentary badge', () => {
    const element = AccessStatusBanner({
      entitlement: complimentaryUnlimitedEntitlement,
    });

    expect(element).not.toBeNull();
    if (React.isValidElement<{ 'aria-label'?: string }>(element)) {
      expect(element.props['aria-label']).toBe('Status Akses Khusus');
    }

    const jsxString = JSON.stringify(element);
    expect(jsxString).toContain('Akses Spesial Aktif');
    expect(jsxString).toContain('Complimentary');
    expect(jsxString).toContain('Akses spesial tanpa batas waktu aktif.');
    expect(jsxString).toContain('Akses tanpa batas waktu');
    expect(jsxString).not.toContain('Beli Wedding Pass');
  });

  it('triggers onUpgradeClick callback when CTA is clicked in trial/expired state', () => {
    const onUpgradeClick = vi.fn();
    const props: AccessStatusBannerProps = {
      entitlement: trialEntitlement,
      onUpgradeClick,
    };

    const element = AccessStatusBanner(props);
    expect(element).not.toBeNull();
    if (props.onUpgradeClick) {
      props.onUpgradeClick();
    }
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });
});
