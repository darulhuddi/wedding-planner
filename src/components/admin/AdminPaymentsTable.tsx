import React from 'react';
import { ShoppingBag, ArrowUpRight, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { AdminOrderSummary } from '../../types/admin';
import {
  formatAdminDate,
  formatAdminPrice,
  formatOrderStatusBadge,
} from '../../domain/adminSelectors';

interface AdminPaymentsTableProps {
  orders: AdminOrderSummary[];
  onSelectOrder?: (orderId: string) => void;
  onNavigateToCouple?: (workspaceId: string) => void;
  isFiltered?: boolean;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function AdminPaymentsTable({
  orders,
  onSelectOrder,
  onNavigateToCouple,
  isFiltered = false,
  page = 1,
  totalPages = 1,
  totalCount,
  pageSize = 25,
  onPageChange,
}: AdminPaymentsTableProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-lg border border-beige-200/80 shadow-xs text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-ivory-100 flex items-center justify-center text-charcoal-400 mx-auto">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-charcoal-900">
            {isFiltered ? 'Tidak ada pesanan yang sesuai' : 'Belum ada pesanan'}
          </h3>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
            {isFiltered
              ? 'Coba sesuaikan kata kunci pencarian atau filter status pesanan.'
              : 'Pesanan Wedding Pass akan muncul di sini setelah pasangan melakukan pembelian.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-beige-200/80 shadow-xs overflow-hidden">
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-ivory-50/90 text-charcoal-500 font-medium border-b border-beige-200/80">
            <tr>
              <th scope="col" className="py-3 px-4 font-semibold text-charcoal-600">ORDER</th>
              <th scope="col" className="py-3 px-4 font-semibold text-charcoal-600">COUPLE</th>
              <th scope="col" className="py-3 px-4 font-semibold text-charcoal-600">PRODUCT</th>
              <th scope="col" className="py-3 px-4 font-semibold text-charcoal-600">AMOUNT</th>
              <th scope="col" className="py-3 px-4 font-semibold text-charcoal-600">STATUS</th>
              <th scope="col" className="py-3 px-4 font-semibold text-charcoal-600">CREATED</th>
              <th scope="col" className="py-3 px-4 text-right font-semibold text-charcoal-600">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige-100">
            {orders.map((order) => {
              const badge = formatOrderStatusBadge(order.status);
              return (
                <tr
                  key={order.id}
                  className="hover:bg-ivory-50/50 transition-colors group cursor-default"
                >
                  {/* Order Number */}
                  <td className="py-3 px-4 font-mono font-bold text-charcoal-900 whitespace-nowrap">
                    {order.orderNumber}
                  </td>

                  {/* Couple Name */}
                  <td className="py-3 px-4 font-medium text-charcoal-800 whitespace-nowrap">
                    {onNavigateToCouple ? (
                      <button
                        onClick={() => onNavigateToCouple(order.workspaceId)}
                        className="hover:text-burgundy-800 hover:underline transition-colors cursor-pointer text-left"
                      >
                        {order.coupleName}
                      </button>
                    ) : (
                      order.coupleName
                    )}
                  </td>

                  {/* Product */}
                  <td className="py-3 px-4 text-charcoal-700 whitespace-nowrap">
                    {order.productName}
                  </td>

                  {/* Amount (Price Snapshot) */}
                  <td className="py-3 px-4 font-mono font-semibold text-charcoal-900 whitespace-nowrap">
                    {formatAdminPrice(order.amount, order.currency)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="py-3 px-4 font-mono text-charcoal-600 whitespace-nowrap">
                    {formatAdminDate(order.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {onSelectOrder && (
                        <button
                          onClick={() => onSelectOrder(order.id)}
                          className="text-xs font-semibold text-burgundy-800 hover:text-burgundy-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Rincian</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onNavigateToCouple && (
                        <button
                          onClick={() => onNavigateToCouple(order.workspaceId)}
                          className="text-xs text-charcoal-400 hover:text-charcoal-700 hover:underline inline-flex items-center gap-1 cursor-pointer ml-1"
                          title="Buka Profil Pasangan"
                        >
                          <User className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (< 768px) */}
      <div className="md:hidden divide-y divide-beige-100">
        {orders.map((order) => {
          const badge = formatOrderStatusBadge(order.status);
          return (
            <div
              key={order.id}
              className="p-4 space-y-2.5 hover:bg-ivory-50/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-charcoal-900">
                  {order.orderNumber}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-charcoal-900 line-clamp-1">
                  {order.coupleName}
                </span>
                <span className="font-mono font-bold text-charcoal-900 shrink-0">
                  {formatAdminPrice(order.amount, order.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-charcoal-500 pt-1 border-t border-beige-100">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />
                  <span>{order.productName}</span>
                </span>
                <span className="font-mono">{formatAdminDate(order.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-beige-100">
                {onSelectOrder && (
                  <button
                    onClick={() => onSelectOrder(order.id)}
                    className="flex-1 py-1.5 bg-ivory-50 hover:bg-ivory-100 border border-beige-200 rounded flex items-center justify-center gap-1 text-xs font-semibold text-burgundy-800 hover:text-burgundy-900 cursor-pointer"
                  >
                    <span>Rincian Transaksi</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {onNavigateToCouple && (
                  <button
                    onClick={() => onNavigateToCouple(order.workspaceId)}
                    className="p-1.5 text-charcoal-500 hover:text-charcoal-800 border border-beige-200 rounded cursor-pointer"
                    title="Buka Profil Pasangan"
                  >
                    <User className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages !== undefined && totalPages > 1 && onPageChange && (
        <div className="px-4 py-3 bg-ivory-50/80 border-t border-beige-200 flex items-center justify-between text-xs text-charcoal-600">
          <div className="flex items-center gap-2">
            <span>
              Halaman <strong className="font-mono text-charcoal-900">{page || 1}</strong> dari{' '}
              <strong className="font-mono text-charcoal-900">{totalPages}</strong>
              {totalCount !== undefined && (
                <span className="text-charcoal-400 ml-1">({totalCount} pesanan)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, (page || 1) - 1))}
              disabled={(page || 1) <= 1}
              className="px-2.5 py-1 bg-white border border-beige-300 rounded font-medium text-charcoal-700 hover:bg-ivory-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition-colors"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <button
              onClick={() => onPageChange(Math.min(totalPages, (page || 1) + 1))}
              disabled={(page || 1) >= totalPages}
              className="px-2.5 py-1 bg-white border border-beige-300 rounded font-medium text-charcoal-700 hover:bg-ivory-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition-colors"
              aria-label="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
