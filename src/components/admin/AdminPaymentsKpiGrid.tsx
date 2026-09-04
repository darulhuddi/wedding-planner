import React from 'react';
import { ShoppingBag, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminPaymentsMetrics } from '../../types/admin';

interface AdminPaymentsKpiGridProps {
  metrics: AdminPaymentsMetrics;
  isLoading?: boolean;
}

export function AdminPaymentsKpiGrid({
  metrics,
  isLoading = false,
}: AdminPaymentsKpiGridProps) {
  const cards = [
    {
      id: 'total-orders',
      title: 'Total Pesanan',
      value: metrics.totalOrders,
      icon: ShoppingBag,
      color: 'text-charcoal-900',
      bgColor: 'bg-ivory-100',
      description: 'Semua pesanan yang tercatat',
    },
    {
      id: 'pending-orders',
      title: 'Menunggu Pembayaran',
      value: metrics.pendingCount,
      icon: Clock,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      description: 'Pesanan berstatus pending',
    },
    {
      id: 'paid-orders',
      title: 'Pembayaran Sukses',
      value: metrics.paidCount,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      description: 'Pesanan lunas & hak aktif',
    },
    {
      id: 'failed-orders',
      title: 'Gagal / Dibatalkan',
      value: metrics.failedCount,
      icon: AlertCircle,
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      description: 'Pesanan gagal / expired',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white p-4 sm:p-5 rounded-lg border border-beige-200/80 shadow-xs flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-charcoal-500 line-clamp-1">
                {card.title}
              </span>
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${card.bgColor} ${card.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 w-16 bg-beige-100 animate-pulse rounded" />
              ) : (
                <div className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 tracking-tight">
                  {card.value}
                </div>
              )}
              <p className="text-[11px] text-charcoal-400 mt-0.5 line-clamp-1">
                {card.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
