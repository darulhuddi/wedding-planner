import React, { useState } from 'react';
import { BudgetDistributionResult } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { PieChart, Sparkles } from 'lucide-react';
import { BudgetCategory } from '../../types/budget';

interface BudgetDonutChartProps {
  distribution: BudgetDistributionResult;
  onOpenStarterTemplate?: () => void;
}

export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({
  distribution,
  onOpenStarterTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | 'all'>('all');
  const [hoveredCategory, setHoveredCategory] = useState<BudgetCategory | null>(null);

  const { items, totalBudget, totalAllocated, hasAllocations, dominantCategoryName, dominantCategoryPercentage } = distribution;

  if (!hasAllocations) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Distribusi Budget</h3>
            <p className="text-xs text-charcoal-400">Pembagian alokasi dana per kategori kebutuhan</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-charcoal-400">
            <PieChart className="w-4 h-4" />
          </div>
        </div>

        <div className="py-10 text-center bg-ivory-50/60 rounded-2xl border border-beige border-dashed p-6 space-y-3">
          <p className="text-xs sm:text-sm text-charcoal-500 font-medium">
            Belum ada alokasi budget yang dibuat.
          </p>
          <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
            Bagi anggaranmu ke dalam kategori utama pernikahan untuk melihat visualisasi distribusi alokasi.
          </p>
          {onOpenStarterTemplate && (
            <button
              type="button"
              onClick={onOpenStarterTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer min-h-touch mt-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gunakan Contoh Pembagian</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate SVG Pie/Donut Slices
  const radius = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const totalAllocatedAmount = items.reduce((sum, i) => sum + i.allocatedAmount, 0);

  let accumulatedOffset = 0;
  const slices = items.map((item) => {
    const fraction = totalAllocatedAmount > 0 ? item.allocatedAmount / totalAllocatedAmount : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      fraction,
    };
  });

  const activeCategory = hoveredCategory || (selectedCategory !== 'all' ? selectedCategory : null);
  const activeItem = activeCategory ? items.find((i) => i.category === activeCategory) : null;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-beige">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Distribusi Budget</h3>
          <p className="text-xs text-charcoal-400">Menunjukkan ke mana alokasi pernikahanmu dialokasikan</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as BudgetCategory | 'all')}
            className="px-3 py-1.5 bg-ivory-50 hover:bg-ivory-100 text-charcoal-700 text-xs font-semibold rounded-xl border border-beige focus:outline-hidden focus:ring-1 focus:ring-burgundy cursor-pointer"
            aria-label="Filter Kategori"
          >
            <option value="all">Semua Kategori ({items.length})</option>
            {items.map((item) => (
              <option key={item.category} value={item.category}>
                {item.name} ({item.percentage}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Visual: Donut Chart + Legend */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left Side: SVG Donut */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative py-2">
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 160 160"
              role="img"
              aria-label="Grafik Distribusi Budget"
            >
              {/* Background ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#E9E1D6"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {slices.map((slice) => {
                const isSelected = selectedCategory === slice.category || hoveredCategory === slice.category;
                const isDimmed = activeCategory && activeCategory !== slice.category;

                return (
                  <circle
                    key={slice.category}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: isDimmed ? 0.35 : 1,
                    }}
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() =>
                      setSelectedCategory(selectedCategory === slice.category ? 'all' : slice.category)
                    }
                  />
                );
              })}
            </svg>

            {/* Center Content in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              {activeItem ? (
                <>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider truncate max-w-[110px]">
                    {activeItem.name}
                  </span>
                  <span className="font-serif text-sm sm:text-base font-bold text-charcoal truncate max-w-[120px] mt-0.5">
                    {formatRupiahNumber(activeItem.allocatedAmount)}
                  </span>
                  <span className="text-[10px] text-charcoal-400 font-medium mt-0.5">
                    {activeItem.percentage}% alokasi
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">
                    Total Alokasi
                  </span>
                  <span className="font-serif text-sm sm:text-base font-bold text-burgundy truncate max-w-[120px] mt-0.5">
                    {formatRupiahNumber(totalAllocated)}
                  </span>
                  <span className="text-[10px] text-charcoal-400 font-medium mt-0.5">
                    {items.length} Kategori
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Responsive Category Breakdown Legend */}
        <div className="md:col-span-7 space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {items.map((item) => {
            const isSelected = selectedCategory === item.category || hoveredCategory === item.category;

            return (
              <div
                key={item.category}
                onMouseEnter={() => setHoveredCategory(item.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() =>
                  setSelectedCategory(selectedCategory === item.category ? 'all' : item.category)
                }
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-burgundy-50/70 border-burgundy-200 shadow-2xs'
                    : 'bg-ivory-50/50 border-beige/60 hover:bg-ivory-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-charcoal truncate">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span className="text-xs sm:text-sm font-bold text-charcoal">
                    {formatRupiahNumber(item.allocatedAmount)}
                  </span>
                  <span className="text-[11px] font-semibold text-charcoal-400 w-10 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Accessible Textual Summary Banner */}
      {dominantCategoryName && (
        <div className="pt-3 border-t border-beige text-xs text-charcoal-500 leading-relaxed flex items-center justify-between">
          <span>
            💡 <strong>{dominantCategoryName}</strong> merupakan alokasi terbesar ({dominantCategoryPercentage}% dari total alokasi).
          </span>
          <span className="text-charcoal-400 text-[11px] hidden sm:inline">
            Total Budget: {formatRupiahNumber(totalBudget)}
          </span>
        </div>
      )}

    </div>
  );
};
