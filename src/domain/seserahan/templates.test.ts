import { describe, it, expect } from 'vitest';
import { SESERAHAN_TEMPLATES, SeserahanTemplateType } from './templates';

describe('Seserahan Starter Templates Tests', () => {
  const templateKeys: SeserahanTemplateType[] = ['basic', 'standard', 'complete', 'custom'];

  it('defines all 4 required template types', () => {
    templateKeys.forEach((key) => {
      expect(SESERAHAN_TEMPLATES[key]).toBeDefined();
      expect(SESERAHAN_TEMPLATES[key].id).toBe(key);
      expect(SESERAHAN_TEMPLATES[key].title).toBeTruthy();
      expect(SESERAHAN_TEMPLATES[key].description).toBeTruthy();
      expect(SESERAHAN_TEMPLATES[key].recommendedBudget).toBeGreaterThanOrEqual(0);
    });
  });

  it('basic template contains essential core categories and items', () => {
    const basic = SESERAHAN_TEMPLATES.basic;
    expect(basic.categories.length).toBe(4);
    const categoryNames = basic.categories.map((c) => c.name);
    expect(categoryNames).toContain('Ibadah');
    expect(categoryNames).toContain('Beauty & Care');
    expect(categoryNames).toContain('Fashion');
    expect(categoryNames).toContain('Personal');

    const totalItems = basic.categories.reduce((acc, c) => acc + c.items.length, 0);
    expect(totalItems).toBe(7);

    // All items must have valid estimated cost
    basic.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        expect(item.name).toBeTruthy();
        expect(item.estimatedCost).toBeGreaterThan(0);
      });
    });
  });

  it('standard template contains balanced complete categories and items', () => {
    const standard = SESERAHAN_TEMPLATES.standard;
    expect(standard.categories.length).toBe(5);
    const categoryNames = standard.categories.map((c) => c.name);
    expect(categoryNames).toContain('Perhiasan');

    const totalItems = standard.categories.reduce((acc, c) => acc + c.items.length, 0);
    expect(totalItems).toBe(13);
  });

  it('complete template contains comprehensive categories and items', () => {
    const complete = SESERAHAN_TEMPLATES.complete;
    expect(complete.categories.length).toBe(6);
    const categoryNames = complete.categories.map((c) => c.name);
    expect(categoryNames).toContain('Makanan & Buah');

    const totalItems = complete.categories.reduce((acc, c) => acc + c.items.length, 0);
    expect(totalItems).toBe(21);
  });

  it('custom template starts with zero categories and items', () => {
    const custom = SESERAHAN_TEMPLATES.custom;
    expect(custom.categories).toHaveLength(0);
    expect(custom.recommendedBudget).toBe(0);
  });
});
