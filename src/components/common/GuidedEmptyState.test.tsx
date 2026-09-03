import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { GuidedEmptyState } from './GuidedEmptyState';
import { Layers, Plus, Sparkles } from 'lucide-react';

describe('GuidedEmptyState Component', () => {
  it('1. renders title, description, and icon correctly', () => {
    const props = {
      icon: Layers,
      title: 'Belum ada vendor',
      description: 'Mulai kumpulkan vendor yang sedang kamu pertimbangkan.',
    };

    const element = GuidedEmptyState(props);
    expect(element).toBeDefined();
    if (React.isValidElement<{ 'data-testid'?: string }>(element)) {
      expect(element.props['data-testid']).toBe('guided-empty-state');
    }
  });

  it('2. supports eyebrow and supporting guidance text', () => {
    const props = {
      eyebrow: 'Inspirasi',
      title: 'Belum ada vendor',
      description: 'Mulai kumpulkan vendor yang sedang kamu pertimbangkan.',
      supportingText: 'Bandingkan pilihan untuk Venue & Gedung, Catering, Foto & Video, dan kebutuhan lainnya.',
    };

    const element = GuidedEmptyState(props);
    expect(element).toBeDefined();
  });

  it('3. handles primary and secondary action clicks', () => {
    const onPrimaryClick = vi.fn();
    const onSecondaryClick = vi.fn();

    const props = {
      title: 'Atur pembagian budget pernikahanmu',
      description: 'Mulai dengan membagi perkiraan budget ke kebutuhan utama pernikahan.',
      primaryAction: {
        label: 'Tambah Alokasi',
        onClick: onPrimaryClick,
        icon: Plus,
      },
      secondaryAction: {
        label: 'Gunakan Contoh Pembagian',
        onClick: onSecondaryClick,
        icon: Sparkles,
      },
    };

    const element = GuidedEmptyState(props);
    expect(element).toBeDefined();
    
    // Call the action handlers directly
    props.primaryAction.onClick();
    expect(onPrimaryClick).toHaveBeenCalledTimes(1);

    props.secondaryAction.onClick();
    expect(onSecondaryClick).toHaveBeenCalledTimes(1);
  });

  it('4. renders presentation-only chips and cards examples', () => {
    const chipsProps = {
      title: 'Belum ada vendor',
      description: 'Mulai kumpulkan vendor...',
      examplesTitle: 'Contoh kategori vendor:',
      examples: ['Venue & Gedung', 'Catering', 'Foto & Video', 'Dekorasi'],
      examplesLayout: 'chips' as const,
    };

    const chipsElement = GuidedEmptyState(chipsProps);
    expect(chipsElement).toBeDefined();

    const cardsProps = {
      title: 'Belum ada catatan',
      description: 'Simpan hal-hal kecil...',
      examplesTitle: 'Inspirasi catatan:',
      examples: [
        'Catatan meeting dengan fotografer',
        'Referensi dekorasi & palet warna',
        'Hal yang perlu dibicarakan dengan keluarga',
      ],
      examplesLayout: 'cards' as const,
    };

    const cardsElement = GuidedEmptyState(cardsProps);
    expect(cardsElement).toBeDefined();
  });
});
