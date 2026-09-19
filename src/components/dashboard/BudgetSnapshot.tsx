import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  UtensilsCrossed,
  Landmark,
  Camera,
  Sparkles,
  Scissors,
  Mail,
  Package,
} from 'lucide-react';
import { StoredBudget, BudgetCategory } from '../../types/budget';
import {
  calculateBudgetOverview,
  calculateBudgetDistribution,
  calculateSpendingTrend,
  CATEGORY_COLORS,
} from '../../domain/budgetSelectors';
import { formatCompactRupiah } from '../../domain/workspaceSelectors';

export interface BudgetSnapshotProps {
  totalBudget?: number;
  estimatedBudget?: number;
  budget: StoredBudget;
  weddingDate?: string;
  onViewBudget: () => void;
  formattedBudget?: string;
  totalSpent?: number;
  totalRemaining?: number;
  hasExpenses?: boolean;
  showTrend?: boolean;
}

const CATEGORY_ICON_MAP: Record<BudgetCategory, React.FC<{ className?: string }>> = {
  venue: Landmark,
  catering: UtensilsCrossed,
  photography: Camera,
  decoration: Sparkles,
  makeup_attire: Scissors,
  invitation: Mail,
  general: Package,
};

export const BudgetSnapshot: React.FC<BudgetSnapshotProps> = ({
  totalBudget: propTotalBudget,
  estimatedBudget: propEstimatedBudget,
  budget,
  weddingDate,
  onViewBudget,
  showTrend = false,
}) => {
  const [timeFilter, setTimeFilter] = useState<'6m' | 'all'>('6m');

  const effectiveBudget = propTotalBudget ?? propEstimatedBudget ?? 0;
  const overview = calculateBudgetOverview(effectiveBudget, budget);
  const distribution = calculateBudgetDistribution(effectiveBudget, budget);
  const trend = calculateSpendingTrend(budget, weddingDate, effectiveBudget);

  const safeTotal = overview.totalBudget;
  const spent = overview.totalSpent;
  const remaining = overview.totalRemaining;
  const isOverBudget = spent > safeTotal && safeTotal > 0;

  const spentPercentage = safeTotal > 0 ? Math.min(100, Math.round((spent / safeTotal) * 100)) : 0;
  const remainingPercentage = Math.max(0, 100 - spentPercentage);

  // Top 3 allocations based on ALLOCATED BUDGET
  const topAllocations = distribution.items.slice(0, 3);

  // Trend points
  const displayTrendPoints = timeFilter === '6m' ? trend.points.slice(-6) : trend.points;

  // Derive deterministic insight
  let insightText = `Budget masih memiliki ruang ${formatCompactRupiah(remaining)}.`;
  if (isOverBudget) {
    insightText = `Pengeluaran telah melebihi target anggaran sebesar ${formatCompactRupiah(spent - safeTotal)}.`;
  } else if (trend.points.length >= 2) {
    const lastPoint = trend.points[trend.points.length - 1];
    const prevPoint = trend.points[trend.points.length - 2];
    if (prevPoint.monthlySpent > 0) {
      const growth = Math.round(((lastPoint.monthlySpent - prevPoint.monthlySpent) / prevPoint.monthlySpent) * 100);
      if (growth > 0) {
        insightText = `Pengeluaran meningkat ${growth}% pada bulan ${lastPoint.periodLabel.split(' ')[0]}.`;
      } else if (growth < 0) {
        insightText = `Pengeluaran melambat ${Math.abs(growth)}% pada bulan ${lastPoint.periodLabel.split(' ')[0]}.`;
      }
    }
  } else if (topAllocations.length > 0) {
    insightText = `${topAllocations[0].name} menjadi alokasi terbesar sebesar ${topAllocations[0].percentage}%.`;
  } else if (safeTotal === 0 && spent === 0) {
    insightText = 'Belum cukup data untuk melihat tren pengeluaran.';
  }

  // Donut geometry
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSpentStroke = (spentPercentage / 100) * donutCircumference;

  // Line/Area Chart geometry
  const chartWidth = 320;
  const chartHeight = 110;
  const chartPaddingTop = 15;
  const chartPaddingBottom = 25;
  const chartPaddingLeft = 38;
  const chartPaddingRight = 15;

  const innerWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
  const innerHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

  const maxVal = Math.max(
    ...displayTrendPoints.map((p) => p.cumulativeSpent),
    safeTotal > 0 ? safeTotal * 0.75 : 10_000_000,
    1_000_000
  );

  const getCoordinates = (index: number, count: number, value: number) => {
    const x = count <= 1 ? chartPaddingLeft + innerWidth / 2 : chartPaddingLeft + (index / (count - 1)) * innerWidth;
    const y = chartPaddingTop + innerHeight - (value / maxVal) * innerHeight;
    return { x, y };
  };

  const linePoints = displayTrendPoints.map((pt, idx) =>
    getCoordinates(idx, displayTrendPoints.length, pt.cumulativeSpent)
  );

  const pathD = linePoints.length > 0
    ? linePoints.reduce((acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), '')
    : '';

  const areaD = linePoints.length > 0
    ? `${pathD} L ${linePoints[linePoints.length - 1].x} ${chartPaddingTop + innerHeight} L ${linePoints[0].x} ${chartPaddingTop + innerHeight} Z`
    : '';

  return (
    <div className="w-full max-w-full box-border bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col space-y-4 sm:space-y-5">
      
      {/* 1. Header Snapshot */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-burgundy" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
            Snapshot Budget
          </h2>
        </div>

        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
          Real-time
        </span>
      </div>

      {/* 2 & 3. Primary Budget Value & Progress Bar */}
      <div className="space-y-3 cursor-pointer" onClick={onViewBudget}>
        <div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
            {isOverBudget ? (
              <span className="text-rose-700">{formatCompactRupiah(Math.abs(remaining))} terlampaui</span>
            ) : (
              <span>{formatCompactRupiah(remaining)} tersisa</span>
            )}
          </div>
          <p className="text-xs text-charcoal-400 mt-0.5">
            dari {formatCompactRupiah(safeTotal)} · {remainingPercentage}% tersisa
          </p>
        </div>

        {/* Horizontal Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full bg-ivory-200 h-3 rounded-full overflow-hidden p-0.5 border border-beige flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(spent > 0 ? 4 : 0, spentPercentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-charcoal-500 font-medium">
            <span>
              {formatCompactRupiah(spent)} terpakai ({spentPercentage}%)
            </span>
            <span>
              {formatCompactRupiah(remaining)} tersisa ({remainingPercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* 4 & 5. Middle Section (Donut Chart + Top 3 Allocations) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 pt-1 items-center border-t border-beige/80">
        
        {/* Compact SVG Donut Chart */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-ivory-50/70 border border-beige">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={donutRadius}
                fill="transparent"
                stroke="#E9E1D6"
                strokeWidth="12"
              />
              {/* Spent Slice */}
              {safeTotal > 0 && spent > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  fill="transparent"
                  stroke={isOverBudget ? '#E11D48' : '#71343B'}
                  strokeWidth="12"
                  strokeDasharray={`${donutSpentStroke} ${donutCircumference}`}
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-serif text-lg font-bold text-charcoal leading-tight">
                {spentPercentage}%
              </span>
              <span className="text-[10px] text-charcoal-400 font-medium leading-none">
                Terpakai
              </span>
            </div>
          </div>

          {/* Mini Legend */}
          <div className="mt-2.5 w-full space-y-1 text-[10px] sm:text-[11px] text-charcoal-600 font-medium">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-burgundy shrink-0" />
                <span>Terpakai</span>
              </span>
              <span className="font-semibold text-charcoal">{formatCompactRupiah(spent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-beige-400 shrink-0" />
                <span>Sisa</span>
              </span>
              <span className="font-semibold text-charcoal">{formatCompactRupiah(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Top 3 Alokasi Terbesar */}
        <div className="sm:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Alokasi Terbesar
            </h3>
            <button
              type="button"
              onClick={onViewBudget}
              className="text-[11px] font-semibold text-burgundy hover:text-burgundy-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Lihat semua</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {topAllocations.length === 0 ? (
            <div className="py-4 text-center rounded-xl bg-ivory-50 border border-dashed border-beige text-xs text-charcoal-400 italic">
              Belum ada alokasi kategori
            </div>
          ) : (
            <div className="space-y-1.5">
              {topAllocations.map((item) => {
                const IconComponent = CATEGORY_ICON_MAP[item.category] || Package;
                return (
                  <div
                    key={item.category}
                    onClick={onViewBudget}
                    className="flex items-center justify-between p-2 rounded-xl bg-ivory-50/80 border border-beige hover:border-beige-300 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${CATEGORY_COLORS[item.category]}18`, color: CATEGORY_COLORS[item.category] }}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-charcoal truncate">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="text-[11px] font-bold text-charcoal-500">
                        {item.percentage}%
                      </span>
                      <span className="text-xs font-bold text-charcoal">
                        {formatCompactRupiah(item.allocatedAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 6 & 7. Tren Pengeluaran & Insight (shown only when showTrend is enabled) */}
      {showTrend && (
        <div className="space-y-3 pt-2 border-t border-beige/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Tren Pengeluaran
            </h3>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as '6m' | 'all')}
              className="text-[11px] font-medium text-charcoal-600 bg-ivory-50 border border-beige rounded-lg px-2 py-0.5 outline-none cursor-pointer"
              aria-label="Filter periode tren pengeluaran"
            >
              <option value="6m">6 bulan terakhir</option>
              <option value="all">Semua periode</option>
            </select>
          </div>

          {/* Pure SVG Line/Area Chart */}
          <div className="w-full bg-ivory-50/60 rounded-xl p-2.5 border border-beige relative overflow-hidden">
            <svg
              className="w-full h-28 overflow-visible"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="snapshotAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71343B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#71343B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.5, 1].map((ratio, i) => {
                const y = chartPaddingTop + innerHeight * (1 - ratio);
                const val = maxVal * ratio;
                return (
                  <g key={i}>
                    <line
                      x1={chartPaddingLeft}
                      y1={y}
                      x2={chartWidth - chartPaddingRight}
                      y2={y}
                      stroke="#E9E1D6"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={chartPaddingLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[8px] fill-charcoal-400 font-sans"
                    >
                      {val === 0 ? '0' : formatCompactRupiah(val).replace('Rp', 'Rp')}
                    </text>
                  </g>
                );
              })}

              {/* Filled Area */}
              {displayTrendPoints.length > 0 && areaD && (
                <path d={areaD} fill="url(#snapshotAreaGrad)" />
              )}

              {/* Line Path */}
              {displayTrendPoints.length > 0 && pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#71343B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Dots & X Labels */}
              {displayTrendPoints.map((pt, idx) => {
                const { x, y } = getCoordinates(idx, displayTrendPoints.length, pt.cumulativeSpent);
                const monthLabel = pt.periodLabel.split(' ')[0] || pt.periodKey;
                return (
                  <g key={pt.periodKey}>
                    <circle
                      cx={x}
                      cy={y}
                      r="3.5"
                      fill="#71343B"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[9px] fill-charcoal-400 font-sans"
                    >
                      {monthLabel}
                    </text>
                  </g>
                );
              })}

              {/* Empty State */}
              {displayTrendPoints.length === 0 && (
                <text
                  x={chartWidth / 2}
                  y={chartHeight / 2}
                  textAnchor="middle"
                  className="text-[11px] fill-charcoal-400 italic"
                >
                  Belum ada data pengeluaran
                </text>
              )}
            </svg>
          </div>

          {/* Deterministic Insight Callout */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-ivory-50 border border-beige text-xs text-charcoal-600">
            <div className="w-5 h-5 rounded-md bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
              <TrendingUp className="w-3 h-3" />
            </div>
            <span className="truncate leading-relaxed">{insightText}</span>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onViewBudget}
            className="w-full py-2.5 px-4 rounded-xl bg-ivory-100 hover:bg-burgundy-50 border border-beige-300 hover:border-burgundy-200 text-burgundy font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <span>Lihat Detail Budget</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
