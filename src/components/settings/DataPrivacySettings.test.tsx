import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataPrivacySettings } from './DataPrivacySettings';

describe('DataPrivacySettings Component Test Suite', () => {
  it('renders Reset Perencanaan card with title, description, and button', () => {
    const onResetMock = vi.fn().mockResolvedValue(undefined);
    const html = renderToStaticMarkup(
      <DataPrivacySettings onResetPlanning={onResetMock} />
    );

    expect(html).toContain('Data &amp; Privasi');
    expect(html).toContain('Reset Perencanaan');
    expect(html).toContain(
      'Mulai kembali dari awal dengan menghapus seluruh data perencanaan pernikahanmu.'
    );
  });
});
