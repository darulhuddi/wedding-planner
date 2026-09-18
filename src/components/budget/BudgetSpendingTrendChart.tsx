import React, { useState } from 'react';
import { SpendingTrendResult, SpendingTrendPoint } from '../../domain/budgetSelectors';
import { formatRupiahNumber, formatCompactRupiah } from '../../domain/workspaceSelectors';
import { TrendingUp, Plus } from 'lucide-react';

interface BudgetSpendingTrendChartProps {
  trendData: SpendingTrendResult;
  onAddExpense?: () => void;
}

export const BudgetSpendingTrendChart: React.FC<BudgetSpendingTrendChartProps> = ({
  trendData,
  onAddExpense,
}) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const { points, hasData, totalSpent, hasBaseline, maxAmount } = trendData;

  if (!hasData || points.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Tren Pengeluaran</h3>
            <p className="text-xs text-charcoal-400">Pantau perkembangan pengeluaran dari waktu ke waktu.</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-charcoal-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="py-12 text-center bg-ivory-50/60 rounded-2xl border border-beige border-dashed p-6 space-y-3">
          <p className="text-xs sm:text-sm text-charcoal-500 font-medium">
            Belum ada catatan pengeluaran.
          </p>
          <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
            Setelah kamu mencatat transaksi pengeluaran pernikahan, grafik tren akumulasi pengeluaran akan muncul di sini.
          </p>
          {onAddExpense && (
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer min-h-touch mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pengeluaran</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Safe ceiling calculation for Y-axis
  const effectiveMax = Math.max(maxAmount * 1.1, 1_000_000);

  // Compute point coordinates
  const n = points.length;
  const getX = (index: number) => {
    if (n <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (n - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / effectiveMax) * chartHeight;
  };

  // Build Actual SVG Path
  const actualCoords = points.map((p, i) => ({ x: getX(i), y: getY(p.cumulativeSpent) }));
  
  let actualPathD = '';
  if (actualCoords.length === 1) {
    actualPathD = `M ${padding.left} ${actualCoords[0].y} L ${padding.left + chartWidth} ${actualCoords[0].y}`;
  } else {
    actualPathD = actualCoords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }

  // Build Area Path for subtle gradient fill
  let actualAreaD = '';
  if (actualCoords.length === 1) {
    const y = actualCoords[0].y;
    actualAreaD = `M ${padding.left} ${padding.top + chartHeight} L ${padding.left} ${y} L ${padding.left + chartWidth} ${y} L ${padding.left + chartWidth} ${padding.top + chartHeight} Z`;
  } else {
    actualAreaD = `${actualPathD} L ${actualCoords[actualCoords.length - 1].x} ${padding.top + chartHeight} L ${actualCoords[0].x} ${padding.top + chartHeight} Z`;
  }

  // Build Planned Baseline Path if available
  let baselinePathD = '';
  if (hasBaseline) {
    const baselineCoords = points.map((p, i) => ({
      x: getX(i),
      y: getY(p.plannedCumulative || 0),
    }));
    baselinePathD = baselineCoords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }

  // Y-axis Grid ticks (4 ticks)
  const yTicks = [0, effectiveMax * 0.33, effectiveMax * 0.66, effectiveMax];

  const activePoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : points[points.length - 1];
  const activeCoord = hoveredPointIndex !== null ? actualCoords[hoveredPointIndex] : actualCoords[actualCoords.length - 1];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-beige">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Tren Pengeluaran</h3>
          <p className="text-xs text-charcoal-400">Pantau perkembangan pengeluaran dari waktu ke waktu.</p>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-burgundy rounded-full shrink-0" />
            <span className="font-medium text-charcoal">Aktual ({formatRupiahNumber(totalSpent)})</span>
          </div>
          {hasBaseline && (
            <div className="flex items-center gap-1.5 text-charcoal-500">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-charcoal-400 shrink-0" />
              <span className="font-medium">Baseline Target</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="Grafik Tren Pengeluaran Akumulatif"
        >
          <defs>
            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#71343B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#71343B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((tickVal, idx) => {
            const y = getY(tickVal);
            return (
              <g key={idx} className="text-charcoal-300">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#F0ECE1"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-charcoal-400 font-sans"
                >
                  {formatCompactRupiah(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={actualAreaD} fill="url(#trendAreaGradient)" />

          {/* Planned Baseline Dashed Line */}
          {hasBaseline && baselinePathD && (
            <path
              d={baselinePathD}
              fill="none"
              stroke="#A8A29E"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Solid Actual Line */}
          <path
            d={actualPathD}
            fill="none"
            stroke="#71343B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Hover Hitboxes */}
          {points.map((pt, idx) => {
            const coord = actualCoords[idx];
            const isHovered = hoveredPointIndex === idx;

            return (
              <g key={idx} className="cursor-pointer">
                {/* X-axis Month Label */}
                <text
                  x={coord.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] font-sans ${
                    isHovered ? 'fill-burgundy font-bold' : 'fill-charcoal-500'
                  }`}
                >
                  {pt.periodLabel}
                </text>

                {/* Point Circle */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#71343B' : '#FAF8F3'}
                  stroke="#71343B"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />

                {/* Invisible Hover Target */}
                <rect
                  x={coord.x - (chartWidth / n / 2 || 20)}
                  y={padding.top}
                  width={chartWidth / n || 40}
                  height={chartHeight + 20}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />
              </g>
            );
          })}

          {/* Active Hover Tooltip in SVG */}
          {activePoint && activeCoord && (
            <g transform={`translate(${activeCoord.x}, ${Math.max(padding.top + 25, activeCoord.y - 12)})`}>
              <line
                x1="0"
                y1={-15}
                x2="0"
                y2={chartHeight + padding.top - activeCoord.y}
                stroke="#71343B"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.4"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Tooltip Card underneath */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-ivory-50 border border-beige text-xs">
          <div className="space-y-0.5">
            <span className="text-charcoal-400 font-semibold block">{activePoint.periodLabel}</span>
            <div className="font-bold text-charcoal text-sm">
              Pengeluaran Bulan Ini: {formatRupiahNumber(activePoint.monthlySpent)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-charcoal-400 text-[10px] block uppercase tracking-wider font-semibold">Total Akumulasi</span>
              <span className="font-serif font-bold text-burgundy text-sm sm:text-base">
                {formatRupiahNumber(activePoint.cumulativeSpent)}
              </span>
            </div>
            {activePoint.plannedCumulative !== undefined && (
              <div className="border-l border-beige pl-3">
                <span className="text-charcoal-400 text-[10px] block uppercase tracking-wider font-semibold">Baseline Target</span>
                <span className="font-bold text-charcoal-600 text-xs sm:text-sm">
                  {formatRupiahNumber(activePoint.plannedCumulative)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
