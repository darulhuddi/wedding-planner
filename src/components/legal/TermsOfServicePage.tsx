import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Printer, Mail, ChevronRight, Scale, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { legalConfig } from '../../config/legalConfig';

interface TermsOfServicePageProps {
  onNavigateHome: () => void;
}

interface ToCItem {
  id: string;
  title: string;
}

const TOC_ITEMS: ToCItem[] = [
  { id: 'sec-1', title: '1. Pendahuluan' },
  { id: 'sec-2', title: '2. Definisi Istilah' },
  { id: 'sec-3', title: '3. Kelayakan Pengguna' },
  { id: 'sec-4', title: '4. Pendaftaran & Keabsahan Akun' },
  { id: 'sec-5', title: '5. Keamanan Kredensial Akun' },
  { id: 'sec-6', title: '6. Penggunaan Layanan yang Diizinkan' },
  { id: 'sec-7', title: '7. Workspace & Konten Pengguna (UGC)' },
  { id: 'sec-8', title: '8. Tanggung Jawab Pengguna' },
  { id: 'sec-9', title: '9. Larangan Penggunaan' },
  { id: 'sec-10', title: '10. Fitur Rekomendasi & Algoritma' },
  { id: 'sec-11', title: '11. Penafian Akurasi Perencanaan' },
  { id: 'sec-12', title: '12. Penafian KUA & Disdukcapil' },
  { id: 'sec-13', title: '13. Layanan Pihak Ketiga' },
  { id: 'sec-14', title: '14. Ketentuan Integrasi TikTok' },
  { id: 'sec-15', title: '15. Ketentuan Integrasi Meta / Instagram' },
  { id: 'sec-16', title: '16. Publikasi Konten Media Sosial' },
  { id: 'sec-17', title: '17. Otorisasi & Kontrol Akses' },
  { id: 'sec-18', title: '18. Ketentuan Pembayaran & Wedding Pass' },
  { id: 'sec-19', title: '19. Kebijakan Pengembalian Dana' },
  { id: 'sec-20', title: '20. Hak Kekayaan Intelektual WedSiap' },
  { id: 'sec-21', title: '21. Lisensi Konten Pengguna' },
  { id: 'sec-22', title: '22. Lisensi Penggunaan Platform' },
  { id: 'sec-23', title: '23. Ketersediaan & Perubahan Layanan' },
  { id: 'sec-24', title: '24. Penangguhan & Penghentian Akun' },
  { id: 'sec-25', title: '25. Ketentuan Penghapusan Akun' },
  { id: 'sec-26', title: '26. Pembatasan Tanggung Jawab' },
  { id: 'sec-27', title: '27. Ganti Rugi (Indemnification)' },
  { id: 'sec-28', title: '28. Hukum Berlaku & Penyelesaian Sengketa' },
  { id: 'sec-29', title: '29. Perubahan Ketentuan Layanan' },
  { id: 'sec-30', title: '30. Informasi Kontak Resmi' },
];

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onNavigateHome }) => {
  const [activeSection, setActiveSection] = useState<string>('sec-1');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      for (let i = TOC_ITEMS.length - 1; i >= 0; i--) {
        const section = document.getElementById(TOC_ITEMS[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(TOC_ITEMS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur-md border-b border-beige transition-all">
        <div className="max-w-container mx-auto px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-charcoal-600 hover:text-burgundy transition-colors py-1.5 px-3 rounded-xl hover:bg-ivory-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal bg-white border border-beige hover:border-beige-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Cetak Ketentuan Layanan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <a
              href={`mailto:${legalConfig.legalContactEmail}`}
              className="flex items-center gap-1.5 text-xs text-burgundy hover:text-burgundy-700 bg-burgundy-50 border border-burgundy-100 px-3 py-1.5 rounded-xl transition-all font-medium cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kontak Legal</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-burgundy-50/60 via-ivory to-ivory border-b border-beige/60 py-10 sm:py-14 px-4 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-burgundy-100/70 border border-burgundy-200 text-burgundy-800 text-xs font-semibold tracking-wide uppercase">
            <Scale className="w-3.5 h-3.5 text-burgundy" />
            <span>Syarat & Ketentuan Penggunaan</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-charcoal">
            Ketentuan Layanan WedSiap
          </h1>

          <p className="text-sm sm:text-base text-charcoal-500 max-w-2xl mx-auto leading-relaxed">
            Harap membaca Ketentuan Layanan ini secara cermat. Perjanjian ini mengatur hak dan kewajiban hukum antara Anda sebagai Pengguna dan WedSiap dalam menggunakan platform perencanaan pernikahan Kami.
          </p>

          <div className="pt-2 text-xs text-charcoal-400 flex items-center justify-center gap-4 flex-wrap">
            <span>Berlaku Efektif: <strong className="text-charcoal">{legalConfig.termsEffectiveDate}</strong></span>
            <span>•</span>
            <span>Pengelola: <strong className="text-charcoal">{legalConfig.legalEntityName}</strong></span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-container mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 bg-white rounded-2xl border border-beige p-5 shadow-soft max-h-[calc(100vh-7rem)] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3 px-2 flex items-center justify-between">
              <span>Daftar Isi</span>
              <span className="text-charcoal-400 font-normal">30 Bagian</span>
            </h3>
            <nav className="space-y-1 text-xs">
              {TOC_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-burgundy text-white font-medium shadow-2xs'
                        : 'text-charcoal-500 hover:text-charcoal hover:bg-ivory-100'
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isActive ? 'text-white' : 'text-charcoal-300 group-hover:translate-x-0.5'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Legal Text Body */}
          <article className="lg:col-span-8 bg-white rounded-2xl border border-beige p-6 sm:p-8 md:p-10 shadow-soft space-y-10 leading-relaxed text-sm sm:text-base text-charcoal-700">
            {/* 1. Pendahuluan */}
            <section id="sec-1" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">1.</span> Pendahuluan
              </h2>
              <p>
                Selamat datang di <strong>WedSiap</strong> (&quot;Layanan&quot;, &quot;Platform&quot;, &quot;Kami&quot;). Dokumen Ketentuan Layanan ini (&quot;Ketentuan&quot;) merupakan perjanjian mengikat secara hukum antara Anda (&quot;Pengguna&quot;, &quot;Anda&quot;) dan <strong>{legalConfig.legalEntityName}</strong> sebagai pengelola resmi platform WedSiap.
              </p>
              <p>
                Dengan mengakses, mendaftar, atau menggunakan platform WedSiap, Anda menyatakan setuju untuk terikat oleh seluruh Syarat dan Ketentuan ini serta Kebijakan Privasi Kami. Apabila Anda tidak menyetujui Ketentuan ini, Anda tidak diperkenankan mengakses atau menggunakan Layanan WedSiap.
              </p>
            </section>

            {/* 2. Definisi Istilah */}
            <section id="sec-2" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">2.</span> Definisi Istilah
              </h2>
              <ul className="space-y-2 text-charcoal-600">
                <li><strong>WedSiap:</strong> Platform aplikasi web perencanaan pernikahan digital yang dikembangkan oleh {legalConfig.legalEntityName}.</li>
                <li><strong>Pengguna:</strong> Perorangan (calon pengantin atau pengelola acara) yang mendaftar dan menggunakan akun WedSiap.</li>
                <li><strong>Wedding Workspace:</strong> Lingkungan kerja pribadi Pengguna di WedSiap yang berisi modul checklist, anggaran, timeline, vendor, seserahan, moodboard, dan administrasi KUA.</li>
                <li><strong>Wedding Pass:</strong> Lisensi akses fitur berbayar berdurasi tertentu atau tak terbatas yang memberikan keuntungan penuh pada modul platform WedSiap.</li>
                <li><strong>Konten Pengguna:</strong> Seluruh data, teks, catatan, foto, dan informasi yang dimasukkan oleh Pengguna ke dalam platform.</li>
                <li><strong>Layanan Pihak Ketiga:</strong> Penyedia pihak eksternal seperti Supabase, Midtrans, Google Drive, Vercel, TikTok, dan Meta/Instagram.</li>
              </ul>
            </section>

            {/* 3. Kelayakan Pengguna */}
            <section id="sec-3" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">3.</span> Kelayakan Pengguna
              </h2>
              <p>
                Untuk dapat menggunakan Layanan WedSiap, Anda menyatakan dan menjamin bahwa:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li>Anda telah berusia sekurang-kurangnya 18 (delapan belas) tahun atau telah memenuhi usia cakap hukum untuk melakukan perjanjian perkawinan sesuai undang-undang Republik Indonesia.</li>
                <li>Anda memiliki kewenangan hukum yang sah untuk mengikatkan diri dalam perjanjian ini.</li>
                <li>Seluruh informasi yang Anda berikan saat pendaftaran adalah akurat, benar, dan terkini.</li>
              </ul>
            </section>

            {/* 4. Pendaftaran & Keabsahan Akun */}
            <section id="sec-4" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">4.</span> Pendaftaran & Keabsahan Akun
              </h2>
              <p>
                Pendaftaran akun di WedSiap dilakukan melalui surel (email) dan kata sandi atau melalui penyedia pendaftaran pihak ketiga seperti Google OAuth. Pengguna wajib memberikan alamat email yang aktif milik Pengguna sendiri.
              </p>
            </section>

            {/* 5. Keamanan Kredensial Akun */}
            <section id="sec-5" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">5.</span> Keamanan dan Keabsahan Kredensial Akun
              </h2>
              <p>
                Pengguna bertanggung jawab penuh atas kerahasiaan kata sandi dan kredensial akun. Setiap aktivitas yang terjadi di bawah akun Pengguna akan dianggap dilakukan secara sah oleh Pengguna. Pengguna wajib segera memberitahukan WedSiap apabila menemukan indikasi penggunaan akun tanpa izin.
              </p>
            </section>

            {/* 6. Penggunaan Layanan yang Diizinkan */}
            <section id="sec-6" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">6.</span> Penggunaan Layanan WedSiap yang Diizinkan
              </h2>
              <p>
                WedSiap memberikan izin terbatas, non-eksklusif, dan dapat dicabut kembali kepada Pengguna untuk mengakses dan menggunakan fitur platform semata-mata untuk keperluan perencanaan pernikahan pribadi Pengguna.
              </p>
            </section>

            {/* 7. Workspace & Konten Pengguna (UGC) */}
            <section id="sec-7" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">7.</span> Workspace Pernikahan dan Konten Pengguna
              </h2>
              <p>
                Pengguna mempertahankan hak milik penuh atas seluruh Konten Pengguna yang dimasukkan ke dalam Wedding Workspace. Pengguna bertanggung jawab penuh atas keabsahan, kebenaran, dan hak cipta data atau gambar yang diunggah ke dalam platform.
              </p>
            </section>

            {/* 8. Tanggung Jawab Pengguna */}
            <section id="sec-8" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">8.</span> Tanggung Jawab dan Kewajiban Pengguna
              </h2>
              <p>Dalam menggunakan WedSiap, Pengguna berkewajiban untuk:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li>Mematuhi seluruh hukum dan peraturan perundang-undangan yang berlaku di Republik Indonesia.</li>
                <li>Memastikan data anggaran dan transaksi vendor dipantau secara mandiri.</li>
                <li>Melakukan verifikasi independen atas kesepakatan harga dan syarat perjanjian dengan vendor pernikahan eksternal.</li>
              </ul>
            </section>

            {/* 9. Larangan Penggunaan */}
            <section id="sec-9" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">9.</span> Larangan Penggunaan (Prohibited Conduct)
              </h2>
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 text-xs sm:text-sm space-y-2 text-rose-900">
                <strong className="block font-semibold">Pengguna dilarang keras untuk:</strong>
                <ul className="list-disc pl-5 space-y-1 text-rose-800">
                  <li>Menggunakan WedSiap untuk aktivitas ilegal, penipuan, atau perbuatan melanggar hukum.</li>
                  <li>Mengunggah materi yang melanggar Hak Kekayaan Intelektual pihak lain, bermuatan pornografi, atau ujaran kebencian.</li>
                  <li>Melakukan tindakan yang merusak, merekayasa balik (reverse engineer), atau meretas infrastruktur WedSiap.</li>
                  <li>Menjual kembali atau menyewakan akses akun WedSiap kepada pihak ketiga secara tidak sah.</li>
                </ul>
              </div>
            </section>

            {/* 10. Fitur Rekomendasi & Algoritma */}
            <section id="sec-10" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">10.</span> Fitur Rekomendasi & Algoritma Sistem
              </h2>
              <p>
                Rekomendasi urutan tugas (&quot;Next Best Action&quot;) dan templat perencanaan di dalam WedSiap dihasilkan oleh algoritma deterministik berdasarkan parameter tanggal dan konteks yang dimasukkan. Rekomendasi ini bersifat <strong>panduan bantu informasi</strong> dan bukan merupakan nasihat hukum, keagamaan, atau finansial mutlak.
              </p>
            </section>

            {/* 11. Penafian Akurasi Perencanaan */}
            <section id="sec-11" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">11.</span> Penafian Akurasi Perencanaan (Accuracy Disclaimer)
              </h2>
              <p>
                WedSiap berusaha menyediakan estimasi dan templat perencanaan seakurat mungkin. Namun demikian, WedSiap tidak menjamin bahwa estimasi biaya, ketersediaan vendor, atau jadwal acara di lapangan akan 100% sesuai tanpa perubahan dari pihak vendor atau penyedia jasa eksternal.
              </p>
            </section>

            {/* 12. Penafian Hubungan Hukum KUA / Disdukcapil */}
            <section id="sec-12" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">12.</span> Penafian Hubungan Hukum Administrasi KUA / Disdukcapil
              </h2>
              <p>
                WedSiap adalah platform alat bantu perencanaan independen dan <strong>bukan merupakan lembaga pemerintah, Kantor Urusan Agama (KUA), atau Dinas Kependudukan dan Pencatatan Sipil (Disdukcapil)</strong>. Prosedur pencatatan nikah resmi sepenuhnya merupakan wewenang instansi pemerintah terkait.
              </p>
            </section>

            {/* 13. Layanan Pihak Ketiga */}
            <section id="sec-13" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">13.</span> Layanan Pihak Ketiga
              </h2>
              <p>
                Platform WedSiap terintegrasi dengan layanan pihak ketiga (seperti Supabase, Midtrans, Google Drive, Vercel). Penggunaan layanan pihak ketiga tersebut tunduk pada syarat dan ketentuan masing-masing penyedia layanan eksternal.
              </p>
            </section>

            {/* 14. Ketentuan Integrasi TikTok */}
            <section id="sec-14" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">14.</span> Ketentuan Integrasi TikTok for Developers
              </h2>
              <p>
                Apabila Pengguna memanfaatkan integrasi TikTok yang tersedia di platform:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li>Pengguna mengotorisasi WedSiap untuk berkomunikasi dengan API TikTok sesuai izin (scope) yang disetujui Pengguna.</li>
                <li>Pengguna wajib mematuhi Ketentuan Komunitas dan Syarat Layanan TikTok saat mempublikasikan konten.</li>
                <li>WedSiap tidak bertanggung jawab atas keputusan penangguhan atau pembatasan akun yang dilakukan oleh pihak TikTok.</li>
              </ul>
            </section>

            {/* 15. Ketentuan Integrasi Meta / Instagram */}
            <section id="sec-15" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">15.</span> Ketentuan Integrasi Instagram / Meta API
              </h2>
              <p>
                Penggunaan integrasi Instagram/Meta wajib mematuhi Ketentuan Pengembang Meta Platforms Inc. Pengguna mengendalikan penuh penyambungan dan pemutusan tautan akun Meta dari platform WedSiap.
              </p>
            </section>

            {/* 16. Publikasi Konten Media Sosial */}
            <section id="sec-16" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">16.</span> Publikasi Konten ke Media Sosial
              </h2>
              <p>
                Seluruh aktivitas publikasi konten atau analisis media sosial dilakukan atas perintah eksplisit Pengguna. WedSiap tidak akan pernah mempublikasikan konten apa pun ke akun media sosial Anda tanpa tindakan pengiriman aktif dari Anda.
              </p>
            </section>

            {/* 17. Otorisasi & Kontrol Akses */}
            <section id="sec-17" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">17.</span> Otorisasi dan Kontrol Akses Pengguna
              </h2>
              <p>
                Pengguna berhak mencabut otorisasi akses aplikasi pihak ketiga dari menu Pengaturan WedSiap atau langsung dari dashboard keamanan penyedia layanan terkait kapan saja.
              </p>
            </section>

            {/* 18. Ketentuan Pembayaran & Wedding Pass */}
            <section id="sec-18" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">18.</span> Ketentuan Pembayaran dan Akses Wedding Pass
              </h2>
              <p>
                Pembelian akses berbayar <strong>Wedding Pass</strong> dilakukan secara sah melalui sistem Midtrans. Hak akses berbayar akan diaktifkan secara otomatis setelah status pembayaran terverifikasi oleh sistem. Harga paket dapat berubah sewaktu-waktu dengan pemberitahuan pada halaman checkout.
              </p>
            </section>

            {/* 19. Kebijakan Pengembalian Dana */}
            <section id="sec-19" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">19.</span> Kebijakan Pengembalian Dana (Refund Policy)
              </h2>
              <p>
                Pembelian paket Wedding Pass bersifat final. Pengembalian dana (refund) hanya dapat dipertimbangkan dalam kondisi kegagalan sistem fatal yang mengakibatkan hak akses tidak dapat diaktifkan setelah transaksi terverifikasi sukses, sesuai evaluasi tim dukungan WedSiap.
              </p>
            </section>

            {/* 20. Hak Kekayaan Intelektual WedSiap */}
            <section id="sec-20" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">20.</span> Hak Kekayaan Intelektual WedSiap
              </h2>
              <p>
                Seluruh hak kekayaan intelektual atas platform WedSiap, termasuk namun tidak terbatas pada kode sumber, desain antarmuka, struktur algoritma, logo, dan merek dagang &quot;WedSiap&quot; adalah milik eksklusif <strong>{legalConfig.legalEntityName}</strong>.
              </p>
            </section>

            {/* 21. Lisensi Konten Pengguna */}
            <section id="sec-21" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">21.</span> Lisensi Konten Pengguna
              </h2>
              <p>
                Dengan mengunggah Konten Pengguna ke WedSiap, Pengguna memberikan lisensi terbatas, non-eksklusif, dan bebas royalti kepada WedSiap semata-mata untuk menyimpan, menampilkan, dan memproses konten tersebut dalam rangka menyediakan Layanan kepada Pengguna.
              </p>
            </section>

            {/* 22. Lisensi Penggunaan Platform */}
            <section id="sec-22" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">22.</span> Lisensi Penggunaan Platform
              </h2>
              <p>
                Pengguna tidak diperbolehkan menggandakan, mendistribusikan, menjual kembali, atau membuat karya turunan dari software WedSiap tanpa izin tertulis dari {legalConfig.legalEntityName}.
              </p>
            </section>

            {/* 23. Ketersediaan & Perubahan Layanan */}
            <section id="sec-23" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">23.</span> Ketersediaan Layanan dan Perubahan Fitur
              </h2>
              <p>
                Kami terus meningkatkan kualitas Layanan. WedSiap berhak menambah, mengubah, atau menghentikan fitur tertentu dengan atau tanpa pemberitahuan sebelumnya demi pemeliharaan atau peningkatan kinerja platform.
              </p>
            </section>

            {/* 24. Penangguhan & Penghentian Akun */}
            <section id="sec-24" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">24.</span> Penangguhan dan Penghentian Akun
              </h2>
              <p>
                WedSiap berhak menangguhkan atau menghentikan akses akun Pengguna secara sepihak apabila Pengguna terbukti melakukan pelanggaran berat terhadap Ketentuan Layanan ini, tindakan penipuan, atau pelanggaran hukum.
              </p>
            </section>

            {/* 25. Ketentuan Penghapusan Akun */}
            <section id="sec-25" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">25.</span> Ketentuan Penghapusan Akun
              </h2>
              <p>
                Pengguna dapat mengajukan penutupan dan penghapusan akun kapan saja dengan menghubungi <strong>{legalConfig.privacyEmail}</strong> atau <strong>{legalConfig.legalContactEmail}</strong> sesuai prosedur yang tercantum dalam Kebijakan Privasi.
              </p>
            </section>

            {/* 26. Pembatasan Tanggung Jawab */}
            <section id="sec-26" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">26.</span> Pembatasan Tanggung Jawab (Limitation of Liability)
              </h2>
              <p>
                Sejauh diizinkan oleh peraturan perundang-undangan di Republik Indonesia (UU ITE dan UU Perlindungan Konsumen), WedSiap dan {legalConfig.legalEntityName} tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau kerugian konsekuensial yang timbul dari keterlambatan vendor eksternal, kesalahan input Pengguna, atau gangguan jaringan telekomunikasi.
              </p>
            </section>

            {/* 27. Ganti Rugi (Indemnification) */}
            <section id="sec-27" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">27.</span> Ganti Rugi (Indemnification)
              </h2>
              <p>
                Pengguna setuju untuk membebaskan WedSiap, direksi, dan karyawannya dari tuntutan atau klaim ganti rugi pihak ketiga yang timbul akibat pelanggaran Pengguna terhadap Ketentuan Layanan ini atau pelanggaran hak-hak pihak ketiga oleh Pengguna.
              </p>
            </section>

            {/* 28. Hukum Berlaku & Penyelesaian Sengketa */}
            <section id="sec-28" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">28.</span> Hukum yang Berlaku dan Penyelesaian Sengketa
              </h2>
              <p>
                Ketentuan Layanan ini diatur dan ditafsirkan berdasarkan hukum <strong>Republik Indonesia</strong>. Setiap sengketa yang timbul dari penggunaan Layanan ini akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat. Apabila tidak tercapai mufakat, sengketa akan diselesaikan melalui yurisdiksi pengadilan negeri di tempat domisili hukum {legalConfig.legalEntityName}.
              </p>
            </section>

            {/* 29. Perubahan Ketentuan Layanan */}
            <section id="sec-29" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">29.</span> Perubahan Ketentuan Layanan
              </h2>
              <p>
                Kami berhak memperbarui Ketentuan Layanan ini dari waktu ke waktu. Perubahan akan berlaku efektif sejak dipublikasikan di platform WedSiap. Penggunaan berkelanjutan atas Layanan setelah perubahan dianggap sebagai persetujuan Pengguna terhadap Ketentuan yang diperbarui.
              </p>
            </section>

            {/* 30. Informasi Kontak Resmi */}
            <section id="sec-30" className="scroll-mt-28 space-y-4 pt-4 border-t border-beige">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">30.</span> Informasi Kontak Resmi
              </h2>
              <p>
                Apabila Anda memiliki pertanyaan atau memerlukan klarifikasi lebih lanjut mengenai Ketentuan Layanan ini, Anda dapat menghubungi tim hukum Kami melalui:
              </p>

              <div className="bg-burgundy-50/70 border border-burgundy-200/80 rounded-2xl p-5 space-y-2 text-charcoal-800">
                <p className="font-bold text-burgundy-900 text-base">{legalConfig.legalEntityName}</p>
                <p className="text-xs sm:text-sm"><strong>Alamat Operasional:</strong> {legalConfig.legalEntityAddress}</p>
                <p className="text-xs sm:text-sm"><strong>Email Kontak Legal:</strong> <a href={`mailto:${legalConfig.legalContactEmail}`} className="text-burgundy underline hover:text-burgundy-800">{legalConfig.legalContactEmail}</a></p>
                <p className="text-xs sm:text-sm"><strong>Situs Resmi:</strong> <a href={legalConfig.websiteUrl} target="_blank" rel="noreferrer" className="text-burgundy underline hover:text-burgundy-800">{legalConfig.websiteUrl}</a></p>
              </div>

              <div className="pt-4 text-center">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-burgundy underline cursor-pointer"
                >
                  <span>Kembali ke Atas Halaman</span>
                </button>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
