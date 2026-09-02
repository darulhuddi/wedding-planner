import React from 'react';
import { Tag, CheckSquare, User, Phone } from 'lucide-react';
import { Vendor } from '../../types/vendor';
import { CATEGORY_LABELS } from '../../domain/categories';
import { VENDOR_STATUS_LABELS } from '../../domain/vendors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={`${className} fill-none stroke-current`} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface VendorCardProps {
  vendor: Vendor;
  relatedTaskCount: number;
  onClick: (vendor: Vendor) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  relatedTaskCount,
  onClick,
}) => {
  // Status style helper
  const getStatusBadgeStyle = (status: Vendor['status']) => {
    switch (status) {
      case 'selected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'considering':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'contacted':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'negotiating':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'not_selected':
        return 'bg-charcoal-50 text-charcoal-500 border-beige-300';
      default:
        return 'bg-ivory-200 text-charcoal-500 border-beige';
    }
  };

  return (
    <div
      onClick={() => onClick(vendor)}
      className="bg-white rounded-2xl p-5 border border-beige hover:border-burgundy-200 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group select-none min-h-touch"
    >
      {/* Top Header: Vendor Name + Status Badge & Category Subtitle */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal group-hover:text-burgundy transition-colors line-clamp-1 flex-1">
            {vendor.name}
          </h3>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getStatusBadgeStyle(
              vendor.status
            )}`}
          >
            {VENDOR_STATUS_LABELS[vendor.status]}
          </span>
        </div>

        <p className="text-xs text-charcoal-400 font-medium">
          {CATEGORY_LABELS[vendor.category]}
        </p>
      </div>

      {/* Quoted Price */}
      <div className="space-y-0.5">
        {vendor.quotedPrice !== null && vendor.quotedPrice > 0 ? (
          <div>
            <span className="font-serif text-lg sm:text-xl font-bold text-burgundy block">
              {formatRupiahNumber(vendor.quotedPrice)}
            </span>
            <span className="text-[10px] text-charcoal-400 font-medium uppercase tracking-wider block">
              Harga Penawaran
            </span>
          </div>
        ) : (
          <span className="text-xs text-charcoal-300 italic block">Belum ada penawaran</span>
        )}
      </div>

      {/* Bottom Metadata Bar */}
      <div className="pt-3 border-t border-beige flex items-center justify-between text-xs text-charcoal-400">
        <div className="flex items-center gap-3 truncate">
          {vendor.contactName && (
            <span className="inline-flex items-center gap-1 truncate" title={vendor.contactName}>
              <User className="w-3.5 h-3.5 text-charcoal-300" />
              <span className="truncate">{vendor.contactName}</span>
            </span>
          )}
          {vendor.phone && !vendor.contactName && (
            <span className="inline-flex items-center gap-1 truncate">
              <Phone className="w-3.5 h-3.5 text-charcoal-300" />
              <span className="truncate">{vendor.phone}</span>
            </span>
          )}
          {vendor.instagram && !vendor.contactName && !vendor.phone && (
            <span className="inline-flex items-center gap-1 truncate">
              <InstagramIcon className="w-3.5 h-3.5 text-charcoal-300" />
              <span className="truncate">{vendor.instagram}</span>
            </span>
          )}
        </div>

        {relatedTaskCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-burgundy bg-burgundy-50 px-2.5 py-0.5 rounded-md border border-burgundy-100 shrink-0">
            <CheckSquare className="w-3 h-3 text-burgundy" />
            <span>{relatedTaskCount} tugas terkait</span>
          </span>
        )}
      </div>
    </div>
  );
};
