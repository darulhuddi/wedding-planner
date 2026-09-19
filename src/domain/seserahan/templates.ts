/**
 * WedSiap Seserahan Starter Templates (V1 Phase 2)
 *
 * Provides sensible starter templates for Indonesian wedding Seserahan.
 * Templates are starting points, NOT strict cultural rules.
 * All items and categories are fully editable by the user.
 */

export type SeserahanTemplateType = 'basic' | 'standard' | 'complete' | 'custom';

export interface TemplateItemDefinition {
  name: string;
  estimatedCost: number;
  notes?: string;
}

export interface TemplateCategoryDefinition {
  name: string;
  items: TemplateItemDefinition[];
}

export interface SeserahanTemplate {
  id: SeserahanTemplateType;
  title: string;
  badge: string;
  description: string;
  recommendedBudget: number;
  categories: TemplateCategoryDefinition[];
}

export const SESERAHAN_TEMPLATES: Record<SeserahanTemplateType, SeserahanTemplate> = {
  basic: {
    id: 'basic',
    title: 'Basic',
    badge: 'Kebutuhan Inti',
    description: 'Daftar seserahan esensial untuk persiapan yang ringkas dan praktis.',
    recommendedBudget: 3000000,
    categories: [
      {
        name: 'Ibadah',
        items: [
          { name: 'Mukena', estimatedCost: 350000 },
          { name: "Al-Qur'an", estimatedCost: 150000 },
        ],
      },
      {
        name: 'Beauty & Care',
        items: [
          { name: 'Skincare', estimatedCost: 500000 },
          { name: 'Parfum', estimatedCost: 400000 },
        ],
      },
      {
        name: 'Fashion',
        items: [
          { name: 'Tas', estimatedCost: 600000 },
          { name: 'Sepatu', estimatedCost: 450000 },
        ],
      },
      {
        name: 'Personal',
        items: [
          { name: 'Barang Personal', estimatedCost: 250000 },
        ],
      },
    ],
  },
  standard: {
    id: 'standard',
    title: 'Standard',
    badge: 'Kebutuhan Lengkap',
    description: 'Pilihan terpopuler dengan rangkaian seserahan lengkap dan seimbang.',
    recommendedBudget: 6500000,
    categories: [
      {
        name: 'Ibadah',
        items: [
          { name: 'Mukena', estimatedCost: 400000 },
          { name: "Al-Qur'an", estimatedCost: 200000 },
          { name: 'Sajadah', estimatedCost: 150000 },
        ],
      },
      {
        name: 'Beauty & Care',
        items: [
          { name: 'Skincare', estimatedCost: 600000 },
          { name: 'Body Care', estimatedCost: 300000 },
          { name: 'Parfum', estimatedCost: 500000 },
          { name: 'Makeup', estimatedCost: 450000 },
        ],
      },
      {
        name: 'Fashion',
        items: [
          { name: 'Pakaian', estimatedCost: 500000 },
          { name: 'Hijab', estimatedCost: 250000 },
          { name: 'Tas', estimatedCost: 750000 },
          { name: 'Sepatu', estimatedCost: 500000 },
        ],
      },
      {
        name: 'Perhiasan',
        items: [
          { name: 'Perhiasan', estimatedCost: 1500000 },
        ],
      },
      {
        name: 'Personal',
        items: [
          { name: 'Barang Personal', estimatedCost: 300000 },
        ],
      },
    ],
  },
  complete: {
    id: 'complete',
    title: 'Complete',
    badge: 'Menyeluruh & Mewah',
    description: 'Koleksi seserahan menyeluruh mencakup kebutuhan adat, busana, dan perhiasan.',
    recommendedBudget: 12000000,
    categories: [
      {
        name: 'Ibadah',
        items: [
          { name: 'Mukena Sutra', estimatedCost: 750000 },
          { name: "Al-Qur'an & Terjemahan", estimatedCost: 250000 },
          { name: 'Sajadah Premium', estimatedCost: 250000 },
          { name: 'Tasbih & Buku Doa', estimatedCost: 100000 },
        ],
      },
      {
        name: 'Beauty & Care',
        items: [
          { name: 'Skincare Set', estimatedCost: 850000 },
          { name: 'Body Care & Spa Set', estimatedCost: 400000 },
          { name: 'Parfum EDP', estimatedCost: 750000 },
          { name: 'Makeup Set Lengkap', estimatedCost: 650000 },
          { name: 'Haircare Set', estimatedCost: 250000 },
        ],
      },
      {
        name: 'Fashion',
        items: [
          { name: 'Pakaian Formal / Kebaya', estimatedCost: 1000000 },
          { name: 'Pakaian Kasual', estimatedCost: 500000 },
          { name: 'Hijab / Scarf Premium', estimatedCost: 350000 },
          { name: 'Tas Tangan / Handbag', estimatedCost: 1200000 },
          { name: 'Sepatu Pesta', estimatedCost: 750000 },
          { name: 'Sandal Santai', estimatedCost: 300000 },
          { name: 'Jam Tangan / Aksesoris', estimatedCost: 1000000 },
        ],
      },
      {
        name: 'Perhiasan',
        items: [
          { name: 'Set Perhiasan Emas / Berlian', estimatedCost: 3000000 },
        ],
      },
      {
        name: 'Makanan & Buah',
        items: [
          { name: 'Buah-buahan Segar', estimatedCost: 350000 },
          { name: 'Kue Tradisional / Jajanan Pasar', estimatedCost: 250000 },
        ],
      },
      {
        name: 'Personal',
        items: [
          { name: 'Pakaian Tidur / Lingerie', estimatedCost: 300000 },
          { name: 'Perlengkapan Mandi & Handuk', estimatedCost: 250000 },
        ],
      },
    ],
  },
  custom: {
    id: 'custom',
    title: 'Custom',
    badge: 'Mulai dari Nol',
    description: 'Mulai dengan kanvas kosong dan tambahkan kategori serta item sesuai keinginanmu.',
    recommendedBudget: 0,
    categories: [],
  },
};
