/**
 * WedFlow Vendor Domain Constants & Helper Labels
 *
 * Single source of truth for VendorStatus labels.
 * Vendor categories reuse the canonical category taxonomy from src/domain/categories.ts.
 */

import { VendorStatus } from '../types/vendor';

export const ALL_VENDOR_STATUSES: VendorStatus[] = [
  'considering',
  'contacted',
  'negotiating',
  'selected',
  'not_selected',
];

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  considering: 'Pertimbangkan',
  contacted: 'Dihubungi',
  negotiating: 'Negosiasi',
  selected: 'Dipilih',
  not_selected: 'Tidak Dipilih',
};
