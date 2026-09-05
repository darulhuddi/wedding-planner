import React, { useState } from 'react';
import { CheckSquare, Wallet, CalendarRange, Users, LayoutDashboard, Check, ChevronRight, Phone } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { formatRupiah } from '../../data/mockData';

export const CoreFeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'budget' | 'timeline' | 'vendors' | 'overview'>('checklist');

  const capabilities = [
    {
      id: 'checklist' as const,
      num: '01',
      title: 'Checklist',
      icon: <CheckSquare className="w-4 h-4" />,
      desc: 'Tahu apa yang harus dilakukan dan kapan harus menyelesaikannya.'
    },
    {
      id: 'budget' as const,
      num: '02',
      title: 'Budget',
      icon: <Wallet className="w-4 h-4" />,
      desc: 'Pantau anggaran, pengeluaran, dan pembayaran tanpa spreadsheet.'
    },
    {
      id: 'timeline' as const,
      num: '03',
      title: 'Timeline',
      icon: <CalendarRange className="w-4 h-4" />,
      desc: 'Susun perjalanan menuju hari-H berdasarkan waktu yang tersisa.'
    },
    {
      id: 'vendors' as const,
      num: '04',
      title: 'Vendors',
      icon: <Users className="w-4 h-4" />,
      desc: 'Simpan vendor, harga, kontak, status, dan pembayaran di satu tempat.'
    },
    {
      id: 'overview' as const,
      num: '05',
      title: 'Wedding Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      desc: 'Lihat kondisi seluruh persiapan pernikahanmu dalam satu layar.'
    }
  ];

  return (
    <section id="fitur" className="py-14 sm:py-20 lg:py-22 bg-ivory-100/40 border-t border-beige">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <SectionHeader
          eyebrow="Fitur Utama"
          title="Semua yang kamu butuhkan, dalam satu tempat."
          subtitle="WedSiap menyatukan bagian penting dari persiapan pernikahan dalam satu workspace."
          align="center"
          className="mb-8 sm:mb-12"
        />

        {/* Responsive Split Layout: 5 Capabilities Navigator + Visual Workspace Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center max-w-6xl mx-auto">
          
          {/* Left Column: 5 Capabilities List (lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            {capabilities.map((cap) => {
              const isActive = activeTab === cap.id;
              return (
                <div
                  key={cap.id}
                  onClick={() => setActiveTab(cap.id)}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 min-h-touch ${
                    isActive
                      ? 'bg-white border-burgundy-300 shadow-soft ring-1 ring-burgundy/20'
                      : 'bg-white/60 border-beige hover:border-beige-300 hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-burgundy text-white shadow-2xs'
                        : 'bg-ivory-200 text-charcoal-400'
                    }`}
                  >
                    {cap.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-serif font-bold ${isActive ? 'text-burgundy' : 'text-charcoal-300'}`}>
                          {cap.num}
                        </span>
                        <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-charcoal' : 'text-charcoal-500'}`}>
                          {cap.title}
                        </h4>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-burgundy shrink-0" />}
                    </div>
                    <p className="text-xs text-charcoal-400 mt-0.5 leading-snug line-clamp-2">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Dynamic Responsive Product Visual (lg: 7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-beige-300 shadow-card min-h-[360px] flex flex-col justify-between">
              
              {/* Dynamic View Header */}
              <div className="flex items-center justify-between pb-3 border-b border-beige">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-burgundy shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 truncate">
                    Modul {capabilities.find(c => c.id === activeTab)?.title}
                  </span>
                </div>
                <span className="text-[11px] text-charcoal-400 bg-ivory-100 px-2.5 py-0.5 rounded-full border border-beige font-medium shrink-0">
                  Adit & Nisa Workspace
                </span>
              </div>

              {/* Dynamic Visual Content based on activeTab */}
              <div className="py-3.5 flex-1 flex flex-col justify-center">
                {activeTab === 'checklist' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-semibold text-charcoal">Tahapan Terjadwal</span>
                      <span className="text-burgundy font-medium">34/50 Selesai</span>
                    </div>
                    {[
                      { title: 'Booking gedung & catat kapasitas tamu', done: true, tag: 'Gedung' },
                      { title: 'Test food catering & pilih 5 menu utama', done: true, tag: 'Catering' },
                      { title: 'Fitting busana akad & resepsi pengantin', done: false, tag: 'MUA' },
                      { title: 'Kirim formulir RSVP undangan digital', done: false, tag: 'Undangan' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-ivory-50/70 rounded-xl border border-beige text-xs sm:text-sm">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${item.done ? 'bg-burgundy border-burgundy text-white' : 'border-charcoal-300'}`}>
                            {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`truncate ${item.done ? 'line-through text-charcoal-300' : 'text-charcoal font-medium'}`}>
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] bg-white px-2 py-0.5 rounded-md border border-beige text-charcoal-400 font-medium shrink-0">
                          {item.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'budget' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-ivory-50 rounded-2xl p-4 sm:p-5 border border-beige">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-xs font-medium text-charcoal-400">Total Anggaran Terpakai</span>
                        <span className="text-xs font-bold text-burgundy">72.4%</span>
                      </div>
                      <div className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal mb-2">
                        {formatRupiah(72450000)} <span className="text-xs font-sans font-normal text-charcoal-400">/ 100M</span>
                      </div>
                      <div className="w-full bg-ivory-200 h-2 rounded-full overflow-hidden mb-2.5">
                        <div className="bg-burgundy h-full rounded-full" style={{ width: '72.4%' }} />
                      </div>
                      <div className="flex justify-between text-xs pt-2.5 border-t border-beige">
                        <span className="text-charcoal-400 font-medium">Sisa Dana Aman</span>
                        <span className="font-semibold text-emerald-700">{formatRupiah(27550000)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div className="space-y-3 pl-3 border-l-2 border-beige-300 animate-fadeIn">
                    <div className="relative pl-3 sm:pl-4">
                      <span className="absolute -left-[18px] sm:-left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <p className="text-xs sm:text-sm font-semibold text-charcoal">H-6 Bulan — Venue & Gedung</p>
                      <p className="text-xs text-charcoal-400">Tanggal dikunci 14 Feb 2027 (Selesai)</p>
                    </div>
                    <div className="relative pl-3 sm:pl-4">
                      <span className="absolute -left-[18px] sm:-left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-burgundy ring-4 ring-white" />
                      <p className="text-xs sm:text-sm font-semibold text-burgundy">H-3 Bulan — Vendor Utama (Fase Ini)</p>
                      <p className="text-xs text-charcoal-400">DP Catering, MUA & Dekorasi sedang berjalan</p>
                    </div>
                    <div className="relative pl-3 sm:pl-4">
                      <span className="absolute -left-[18px] sm:-left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-beige-300 ring-4 ring-white" />
                      <p className="text-xs sm:text-sm font-semibold text-charcoal-400">Hari-H — 14 Februari 2027</p>
                      <p className="text-xs text-charcoal-300">Akad & Resepsi pernikahan</p>
                    </div>
                  </div>
                )}

                {activeTab === 'vendors' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="bg-ivory-50 rounded-xl p-3 sm:p-4 border border-beige flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                      <div>
                        <span className="font-semibold text-xs sm:text-sm text-charcoal block">Puspa Catering Nusantara</span>
                        <span className="text-[11px] text-charcoal-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-gold-600 shrink-0" />
                          Mbak Ratna (+62 812-3456-789)
                        </span>
                      </div>
                      <div className="flex xs:flex-col items-center xs:items-end justify-between gap-1 pt-1 xs:pt-0 border-t xs:border-t-0 border-beige/60">
                        <span className="text-xs sm:text-sm font-bold text-charcoal">{formatRupiah(25000000)}</span>
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">DP 50%</span>
                      </div>
                    </div>
                    <div className="bg-ivory-50 rounded-xl p-3 sm:p-4 border border-beige flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                      <div>
                        <span className="font-semibold text-xs sm:text-sm text-charcoal block">Sasana Kriya Grand Ballroom</span>
                        <span className="text-[11px] text-charcoal-400">Venue Utama</span>
                      </div>
                      <div className="flex xs:flex-col items-center xs:items-end justify-between gap-1 pt-1 xs:pt-0 border-t xs:border-t-0 border-beige/60">
                        <span className="text-xs sm:text-sm font-bold text-charcoal">{formatRupiah(40000000)}</span>
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">Lunas</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'overview' && (
                  <div className="bg-ivory-50 rounded-2xl p-4 sm:p-5 border border-beige space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-charcoal">Status Kesiapan Keseluruhan</span>
                      <span className="text-xs font-bold text-burgundy">68% Siap</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-beige shadow-2xs">
                        <span className="text-charcoal-400 text-[9px] sm:text-[10px] uppercase font-semibold block mb-0.5">Checklist</span>
                        <span className="font-bold text-xs sm:text-sm text-charcoal">34/50</span>
                      </div>
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-beige shadow-2xs">
                        <span className="text-charcoal-400 text-[9px] sm:text-[10px] uppercase font-semibold block mb-0.5">Vendor</span>
                        <span className="font-bold text-xs sm:text-sm text-charcoal">5/7</span>
                      </div>
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-beige shadow-2xs">
                        <span className="text-charcoal-400 text-[9px] sm:text-[10px] uppercase font-semibold block mb-0.5">Countdown</span>
                        <span className="font-bold text-xs sm:text-sm text-burgundy">166 hari</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* View Footer Note */}
              <div className="pt-2.5 border-t border-beige flex flex-col sm:flex-row sm:items-center justify-between text-xs text-charcoal-400 gap-1">
                <span>✓ Terhubung dalam satu workspace</span>
                <span className="text-burgundy font-medium hidden sm:inline">Klik tab modul di sebelah kiri</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
