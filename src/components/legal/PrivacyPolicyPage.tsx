import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Printer, Mail, ChevronRight, ExternalLink, Lock, CheckCircle2 } from 'lucide-react';
import { legalConfig } from '../../config/legalConfig';

interface PrivacyPolicyPageProps {
  onNavigateHome: () => void;
}

interface ToCItem {
  id: string;
  title: string;
}

const TOC_ITEMS: ToCItem[] = [
  { id: 'sec-1', title: '1. Pendahuluan' },
  { id: 'sec-2', title: '2. Identitas Pengelola Layanan' },
  { id: 'sec-3', title: '3. Ruang Lingkup Kebijakan' },
  { id: 'sec-4', title: '4. Informasi yang Kami Kumpulkan' },
  { id: 'sec-5', title: '5. Penggunaan Informasi Pengguna' },
  { id: 'sec-6', title: '6. Dasar Hukum Pemrosesan Data (UU PDP)' },
  { id: 'sec-7', title: '7. Penyimpanan & Infrastruktur Data' },
  { id: 'sec-8', title: '8. Keamanan Data' },
  { id: 'sec-9', title: '9. Masa Retensi Data' },
  { id: 'sec-10', title: '10. Penyedia Layanan Pihak Ketiga' },
  { id: 'sec-11', title: '11. Pemrosesan Pembayaran (Midtrans)' },
  { id: 'sec-12', title: '12. Layanan Autentikasi (Supabase & Google)' },
  { id: 'sec-13', title: '13. Pemrosesan Algoritma & Rekomendasi' },
  { id: 'sec-14', title: '14. Integrasi Media Sosial' },
  { id: 'sec-15', title: '15. Ketentuan Integrasi TikTok' },
  { id: 'sec-16', title: '16. Ketentuan Integrasi Meta / Instagram' },
  { id: 'sec-17', title: '17. Analitik & Pengukuran Kinerja' },
  { id: 'sec-18', title: '18. Cookie & Penyimpanan Lokal' },
  { id: 'sec-19', title: '19. Hak-Hak Subjek Data' },
  { id: 'sec-20', title: '20. Permintaan Akses & Koreksi Data' },
  { id: 'sec-21', title: '21. Prosedur Penghapusan Akun & Data' },
  { id: 'sec-22', title: '22. Penghapusan Data Akun Sosial Terhubung' },
  { id: 'sec-23', title: '23. Transfer Data Lintas Batas' },
  { id: 'sec-24', title: '24. Privasi Anak di Bawah Umur' },
  { id: 'sec-25', title: '25. Perubahan Kebijakan Privasi' },
  { id: 'sec-26', title: '26. Informasi Kontak Privasi' },
];

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigateHome }) => {
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
              title="Cetak Kebijakan Privasi"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <a
              href={`mailto:${legalConfig.privacyEmail}`}
              className="flex items-center gap-1.5 text-xs text-burgundy hover:text-burgundy-700 bg-burgundy-50 border border-burgundy-100 px-3 py-1.5 rounded-xl transition-all font-medium cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kontak Privasi</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-burgundy-50/60 via-ivory to-ivory border-b border-beige/60 py-10 sm:py-14 px-4 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-burgundy-100/70 border border-burgundy-200 text-burgundy-800 text-xs font-semibold tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5 text-burgundy" />
            <span>Dokumen Hukum Resmi</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-charcoal">
            Kebijakan Privasi WedSiap
          </h1>

          <p className="text-sm sm:text-base text-charcoal-500 max-w-2xl mx-auto leading-relaxed">
            WedSiap berkomitmen penuh untuk melindungi privasi dan keamanan data pribadi calon pengantin Indonesia. Dokumen ini menjelaskan secara transparan bagaimana data Anda dikumpulkan, digunakan, dan dilindungi.
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
              <span className="text-charcoal-400 font-normal">26 Bagian</span>
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
                Selamat datang di <strong>WedSiap</strong> (&quot;Layanan&quot;, &quot;Platform&quot;, &quot;Kami&quot;). Kebijakan Privasi ini dirancang untuk membantu Anda memahami secara menyeluruh bagaimana Kami mengumpulkan, menggunakan, menyimpan, memproses, dan melindungi Informasi Pribadi yang Anda berikan saat mengakses dan menggunakan platform perencanaan pernikahan WedSiap.
              </p>
              <p>
                Dengan mendaftar, mengakses, atau menggunakan Layanan WedSiap, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui seluruh ketentuan dalam Kebijakan Privasi ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak melanjutkan penggunaan Layanan Kami.
              </p>
            </section>

            {/* 2. Identitas Pengelola Layanan */}
            <section id="sec-2" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">2.</span> Identitas Pengelola Layanan
              </h2>
              <p>
                Layanan WedSiap dikembangkan, dioperasikan, dan dikelola secara sah oleh:
              </p>
              <div className="bg-ivory-100 border border-beige-300 rounded-xl p-4 text-xs sm:text-sm space-y-1.5 font-mono text-charcoal-800">
                <p><strong>Nama Entitas Hukum:</strong> {legalConfig.legalEntityName}</p>
                <p><strong>Alamat Operasional:</strong> {legalConfig.legalEntityAddress}</p>
                <p><strong>Email Kontak Layanan:</strong> {legalConfig.legalContactEmail}</p>
                <p><strong>Email Penanggung Jawab Privasi:</strong> {legalConfig.privacyEmail}</p>
                <p><strong>Situs Resmi:</strong> {legalConfig.websiteUrl}</p>
              </div>
            </section>

            {/* 3. Ruang Lingkup Kebijakan */}
            <section id="sec-3" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">3.</span> Ruang Lingkup Kebijakan Privasi
              </h2>
              <p>
                Kebijakan Privasi ini berlaku untuk seluruh fitur dan modul dalam ekosistem WedSiap, termasuk namun tidak terbatas pada:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>Situs web resmi dan aplikasi web WedSiap.</li>
                <li>Modul Workspace Perencanaan Pernikahan (Checklist, Budgeting, Timeline, Vendor Planning, Seserahan, Moodboard, dan Administrasi KUA).</li>
                <li>Layanan berbayar WedSiap (Wedding Pass).</li>
                <li>Integrasi layanan pihak ketiga (autentikasi Google, Google Drive, pembayaran Midtrans, serta integrasi media sosial masa depan seperti TikTok dan Meta/Instagram).</li>
              </ul>
            </section>

            {/* 4. Informasi yang Kami Kumpulkan */}
            <section id="sec-4" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">4.</span> Informasi yang Kami Kumpulkan
              </h2>
              <p>
                Kami mengumpulkan beberapa kategori data dari Anda tergantung pada fitur yang Anda gunakan:
              </p>

              <div className="space-y-3">
                <h3 className="font-semibold text-charcoal text-sm sm:text-base">a. Informasi Akun & Autentikasi</h3>
                <p className="text-charcoal-600">
                  Saat mendaftar akun WedSiap via email atau Google OAuth, Kami mengumpulkan alamat email, nama tampilan, serta kata sandi yang dienkripsi secara aman melalui Supabase Auth. Apabila Anda login menggunakan Google OAuth, Kami menerima alamat email, nama, dan foto profil publik dari akun Google Anda.
                </p>

                <h3 className="font-semibold text-charcoal text-sm sm:text-base">b. Informasi Workspace Pernikahan</h3>
                <p className="text-charcoal-600">
                  Untuk menyediakan fungsi perencanaan pernikahan, Kami menyimpan informasi yang Anda masukkan secara sukarela, seperti: nama pasangan, tanggal rencana pernikahan, estimasi anggaran, estimasi jumlah tamu, prioritas perencanaan utama, konteks keagamaan dan budaya, serta rincian acara pernikahan.
                </p>

                <h3 className="font-semibold text-charcoal text-sm sm:text-base">c. Konten buatan Pengguna (User-Generated Content)</h3>
                <p className="text-charcoal-600">
                  Data daftar tugas checklist, pengeluaran anggaran, data kontak vendor yang diinput, daftar nama tamu, catatan pribadi, serta rincian barang seserahan yang Anda buat di dalam workspace.
                </p>

                <h3 className="font-semibold text-charcoal text-sm sm:text-base">d. File dan Media Inspirasi (Supabase Storage & Google Drive API)</h3>
                <p className="text-charcoal-600">
                  Jika Anda mengunggah gambar ke modul Moodboard, file disimpan pada Supabase Storage. Apabila Anda memilih untuk menghubungkan Google Drive via Google Drive Picker API, WedSiap hanya menggunakan izin akses terbatas (scope <code>https://www.googleapis.com/auth/drive.file</code>) untuk membaca file yang Anda pilih secara eksplisit tanpa mengunggah file asli ke server WedSiap.
                </p>

                <h3 className="font-semibold text-charcoal text-sm sm:text-base">e. Informasi Transaksi & Pembayaran (Midtrans)</h3>
                <p className="text-charcoal-600">
                  Saat Anda membeli paket Wedding Pass, pemrosesan pembayaran dilakukan oleh Midtrans Payment Gateway. WedSiap menyimpan nomor order, status pembayaran, jumlah pembayaran, metode pembayaran (seperti QRIS, Transfer Bank, E-Wallet), serta tanggal transaksi. WedSiap <strong>tidak pernah menyimpan nomor kartu kredit atau kredensial perbankan Anda</strong> secara langsung.
                </p>

                <h3 className="font-semibold text-charcoal text-sm sm:text-base">f. Data Teknis & Penggunaan (Vercel Analytics)</h3>
                <p className="text-charcoal-600">
                  Kami mengumpulkan data teknis berupa alamat IP (anonim), tipe browser, jenis perangkat, dan metrik kinerja penggunaan secara agregat menggunakan Vercel Analytics untuk pemeliharaan dan peningkatan kualitas platform.
                </p>

                <h3 className="font-semibold text-charcoal text-sm sm:text-base">g. Token Otorisasi Media Sosial Masa Depan</h3>
                <p className="text-charcoal-600">
                  Apabila di masa mendatang Anda secara eksplisit menghubungkan akun media sosial (seperti TikTok atau Instagram/Meta), Kami hanya mengumpulkan token akses otorisasi yang terbatas pada cakupan izin (scope) yang Anda setujui.
                </p>
              </div>
            </section>

            {/* 5. Penggunaan Informasi Pengguna */}
            <section id="sec-5" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">5.</span> Cara Kami Menggunakan Informasi Anda
              </h2>
              <p>Kami menggunakan data yang dikumpulkan untuk tujuan berikut:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li>Menyediakan, mengoperasikan, dan memelihara modul perencanaan pernikahan Anda.</li>
                <li>Memproses pembayaran dan memverifikasi akses berbayar Wedding Pass Anda via Midtrans.</li>
                <li>Menyinkronkan data antar-perangkat secara realtime melalui infrastruktur Supabase.</li>
                <li>Menghasilkan rekomendasi urutan langkah (&quot;Next Best Action&quot;) secara matematis dan deterministik berdasarkan konteks pernikahan yang Anda masukkan.</li>
                <li>Memberikan dukungan teknis dan merespons pertanyaan layanan pelanggan.</li>
                <li>Mencegah aktivitas penipuan, pelanggaran keamanan, atau tindakan ilegal.</li>
                <li>Mengirimkan pemberitahuan penting terkait status transaksi atau perubahan kebijakan.</li>
              </ul>
            </section>

            {/* 6. Dasar Hukum Pemrosesan Data */}
            <section id="sec-6" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">6.</span> Dasar Hukum Pemrosesan Data (UU PDP)
              </h2>
              <p>
                Sesuai dengan <strong>Undang-Undang Republik Indonesia No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)</strong>, pemrosesan Data Pribadi Anda oleh WedSiap didasarkan pada:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li><strong>Persetujuan (Consent):</strong> Persetujuan eksplisit yang Anda berikan saat membuat akun dan menghubungkan layanan pihak ketiga.</li>
                <li><strong>Pelaksanaan Kontrak:</strong> Pemrosesan data yang diperlukan untuk memenuhi kewajiban penyediaan Layanan sesuai Ketentuan Layanan (Terms of Service).</li>
                <li><strong>Kewajiban Hukum:</strong> Pemenuhan kewajiban perpajakan, pencatatan transaksi keuangan, dan regulasi di Republik Indonesia.</li>
                <li><strong>Kepentingan Sah (Legitimate Interest):</strong> Menjaga keamanan sistem, mencegah penipuan, dan meningkatkan kualitas platform secara terukur.</li>
              </ul>
            </section>

            {/* 7. Penyimpanan & Infrastruktur Data */}
            <section id="sec-7" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">7.</span> Penyimpanan & Infrastruktur Data
              </h2>
              <p>
                Data workspace dan pengguna WedSiap disimpan secara terenkripsi dalam infrastruktur basis data cloud berbasis <strong>Supabase (PostgreSQL)</strong>. Supabase menerapkan standar keamanan industri tinggi dengan Row Level Security (RLS) untuk memastikan data workspace Anda hanya dapat diakses oleh akun Anda yang sah.
              </p>
            </section>

            {/* 8. Keamanan Data */}
            <section id="sec-8" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">8.</span> Keamanan Data Pengguna
              </h2>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
                <Lock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm leading-relaxed">
                  <strong>Enkripsi Standar Industri:</strong> Seluruh komunikasi data antara browser Anda dan server WedSiap dilindungi oleh enkripsi Transport Layer Security (TLS 1.3 / HTTPS). Kredensial kata sandi tidak pernah disimpan dalam bentuk teks mentah (plain text).
                </div>
              </div>
              <p>
                Meskipun Kami menerapkan pengamanan teknis terbaik, tidak ada metode transmisi internet yang 100% aman. Pengguna bertanggung jawab penuh untuk menjaga kerahasiaan kata sandi dan kredensial akun masing-masing.
              </p>
            </section>

            {/* 9. Masa Retensi Data */}
            <section id="sec-9" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">9.</span> Masa Retensi dan Penyimpanan Data
              </h2>
              <p>
                Kami menyimpan Data Pribadi Anda selama akun Anda aktif atau sejauh yang diperlukan untuk menyediakan Layanan. Data transaksi keuangan disimpan sesuai ketentuan hukum perpajakan yang berlaku di Indonesia (sekurang-kurangnya 5-10 tahun). Apabila Anda mengajukan penghapusan akun, data workspace Anda akan dihapus atau dianonimkan sesuai prosedur penghapusan data.
              </p>
            </section>

            {/* 10. Penyedia Layanan Pihak Ketiga */}
            <section id="sec-10" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">10.</span> Penyedia Layanan Pihak Ketiga
              </h2>
              <p>
                WedSiap menggunakan penyedia layanan pihak ketiga tepercaya untuk menjalankan fungsi inti platform. Kami tidak menjual data pribadi Anda kepada pihak mana pun. Berikut penyedia layanan yang terhubung:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-ivory-100 border border-beige-300">
                  <strong className="text-charcoal block mb-1">Supabase Inc.</strong>
                  <span className="text-charcoal-600">Autentikasi akun, penyimpanan basis data PostgreSQL, dan file media Supabase Storage.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-ivory-100 border border-beige-300">
                  <strong className="text-charcoal block mb-1">PT Midtrans (GoTo Financial)</strong>
                  <span className="text-charcoal-600">Pemrosesan transaksi pembayaran aman untuk pembelian Wedding Pass.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-ivory-100 border border-beige-300">
                  <strong className="text-charcoal block mb-1">Google LLC</strong>
                  <span className="text-charcoal-600">Autentikasi Google OAuth & Google Drive Picker API (scope drive.file).</span>
                </div>
                <div className="p-3.5 rounded-xl bg-ivory-100 border border-beige-300">
                  <strong className="text-charcoal block mb-1">Vercel Inc.</strong>
                  <span className="text-charcoal-600">Hosting aplikasi web dan pengukuran statistik analitik anonim via Vercel Analytics.</span>
                </div>
              </div>
            </section>

            {/* 11. Pemrosesan Pembayaran (Midtrans) */}
            <section id="sec-11" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">11.</span> Pemrosesan Pembayaran (Midtrans)
              </h2>
              <p>
                Seluruh transaksi pembayaran diproses melalui gerbang pembayaran resmi <strong>Midtrans</strong>. Saat melakukan pembayaran, data transaksi Anda diproses langsung oleh sistem Midtrans yang memenuhi standar sertifikasi Payment Card Industry Data Security Standard (PCI-DSS). WedSiap hanya menerima konfirmasi status pembayaran (sukses, pending, kadaluarsa, atau batal) melalui edge function aman.
              </p>
            </section>

            {/* 12. Layanan Autentikasi (Supabase & Google) */}
            <section id="sec-12" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">12.</span> Layanan Autentikasi (Supabase Auth & Google OAuth)
              </h2>
              <p>
                WedSiap menyediakan opsi masuk menggunakan akun Google (Google OAuth). Apabila Anda menggunakan opsi ini, Anda mengizinkan Google untuk memberikan informasi profil dasar Anda (nama, email, foto profil) kepada WedSiap. Kami menggunakan data ini semata-mata untuk mengautentikasi dan membuat profil akun Anda di WedSiap.
              </p>
            </section>

            {/* 13. Pemrosesan Algoritma & Rekomendasi */}
            <section id="sec-13" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">13.</span> Pemrosesan Algoritma & Rekomendasi
              </h2>
              <p>
                Fitur rujukan persiapan pernikahan (&quot;Next Best Action&quot; dan starter plan) di dalam WedSiap dihitung menggunakan <strong>algoritma deterministik berbasis aturan (rule-based engine)</strong> langsung pada peranti Anda. WedSiap <strong>tidak menggunakan kecerdasan buatan (AI) pihak ketiga untuk melatih model data dari konten pribadi Anda</strong>.
              </p>
            </section>

            {/* 14. Integrasi Media Sosial (Umum) */}
            <section id="sec-14" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">14.</span> Integrasi Media Sosial Masa Depan
              </h2>
              <p>
                Pengguna dapat memilih untuk menghubungkan akun media sosial eksternal di masa depan. Hubungan ini sepenuhnya bersifat opsional dan memerlukan persetujuan eksplisit dari Pengguna melalui dialog otorisasi OAuth platform terkait.
              </p>
            </section>

            {/* 15. Ketentuan Integrasi TikTok */}
            <section id="sec-15" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">15.</span> Integrasi TikTok for Developers
              </h2>
              <p>
                Apabila Anda menghubungkan akun TikTok Anda dengan WedSiap:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li>WedSiap hanya mengakses data dan otorisasi yang Anda izinkan secara eksplisit saat menghubungkan akun.</li>
                <li>Token otorisasi digunakan semata-mata untuk fitur publikasi konten atau analitik media sosial yang Anda jalankan sendiri.</li>
                <li>WedSiap tidak memiliki akses ke pesan pribadi atau kredensial akun TikTok Anda.</li>
                <li>Anda dapat mencabut izin otorisasi WedSiap kapan saja melalui pengaturan akun TikTok Anda atau dari menu pengaturan WedSiap.</li>
                <li>Penggunaan fitur TikTok tunduk pada Syarat Layanan dan Kebijakan Privasi resmi dari TikTok. WedSiap bukan bagian dari TikTok Inc.</li>
              </ul>
            </section>

            {/* 16. Ketentuan Integrasi Meta / Instagram */}
            <section id="sec-16" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">16.</span> Integrasi Meta & Instagram API
              </h2>
              <p>
                Apabila Anda menghubungkan akun Meta/Instagram Anda dengan WedSiap:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li>Akses API dikendalikan penuh oleh token OAuth berdurasi terbatas.</li>
                <li>WedSiap tidak menyimpan kata sandi Instagram Anda.</li>
                <li>Anda berhak memutuskan hubungan otorisasi Meta/Instagram kapan saja.</li>
                <li>Penggunaan fitur Instagram tunduk pada Kebijakan Data Meta Platforms Inc.</li>
              </ul>
            </section>

            {/* 17. Analitik & Pengukuran Kinerja */}
            <section id="sec-17" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">17.</span> Analitik dan Pengukuran Kinerja (Vercel Analytics)
              </h2>
              <p>
                WedSiap menggunakan Vercel Analytics untuk mengumpulkan informasi penggunaan agregat non-identitas pribadi, seperti jumlah kunjungan halaman dan kecepatan pemuatan aplikasi, demi mengoptimalkan kenyamanan akses pengguna.
              </p>
            </section>

            {/* 18. Cookie & Penyimpanan Lokal */}
            <section id="sec-18" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">18.</span> Cookie dan Teknologi Penyimpanan Lokal
              </h2>
              <p>
                WedSiap menggunakan teknologi penyimpanan lokal browser (<code>localStorage</code> dan <code>sessionStorage</code>) untuk mempertahankan sesi masuk Anda (token Supabase <code>sb-auth-token</code>) dan menyimpan sementara status perencanaan saat pengisian awal. Kami tidak menggunakan cookie pelacak iklan pihak ketiga yang menjual data perilaku Anda.
              </p>
            </section>

            {/* 19. Hak-Hak Subjek Data */}
            <section id="sec-19" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">19.</span> Hak-Hak Subjek Data Pengguna
              </h2>
              <p>Berdasarkan UU PDP, Anda memiliki hak-hak berikut terhadap Data Pribadi Anda:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
                <li><strong>Hak Akses:</strong> Meminta salinan data pribadi yang Kami simpan tentang Anda.</li>
                <li><strong>Hak Koreksi:</strong> Mengubah atau memperbarui data pribadi yang tidak akurat melalui menu Pengaturan.</li>
                <li><strong>Hak Penghapusan:</strong> Meminta penghapusan permanen atas data pribadi dan akun Anda.</li>
                <li><strong>Hak Penarikan Persetujuan:</strong> Membatalkan persetujuan pemrosesan data atau mencabut otorisasi aplikasi terhubung.</li>
              </ul>
            </section>

            {/* 20. Permintaan Akses & Koreksi Data */}
            <section id="sec-20" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">20.</span> Permintaan Akses, Koreksi, dan Pembaruan Data
              </h2>
              <p>
                Anda dapat memperbarui data perencanaan pernikahan Anda kapan saja secara mandiri melalui menu Pengaturan Workspace di dalam aplikasi. Apabila Anda membutuhkan salinan data atau penyesuaian khusus, Anda dapat mengirimkan permintaan resmi via email ke <strong>{legalConfig.privacyEmail}</strong>.
              </p>
            </section>

            {/* 21. Prosedur Penghapusan Akun & Data */}
            <section id="sec-21" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">21.</span> Prosedur Penghapusan Akun & Data Pribadi
              </h2>
              <p>
                Untuk mengajukan penghapusan akun WedSiap beserta seluruh data workspace dan informasi pribadi terkait:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-charcoal-600">
                <li>Kirimkan email dari alamat email yang terdaftar di WedSiap ke <strong>{legalConfig.privacyEmail}</strong> atau <strong>{legalConfig.legalContactEmail}</strong>.</li>
                <li>Gunakan subjek email: <code>Permintaan Penghapusan Akun WedSiap - [Email Anda]</code>.</li>
                <li>Tim Layanan Pelanggan Kami akan melakukan verifikasi identitas akun dan memproses penghapusan permanen dalam waktu selambat-lambatnya <strong>3x24 jam kerja</strong>.</li>
              </ol>
              <p className="text-xs text-charcoal-500 bg-ivory-100 p-3 rounded-xl border border-beige">
                <em>Catatan Pengembangan Fitur: WedSiap sedang menyiapkan fitur tombol penghapusan akun otomatis langsung dari menu Pengaturan Aplikasi untuk pemutakhiran versi berikutnya.</em>
              </p>
            </section>

            {/* 22. Penghapusan Data Akun Sosial Terhubung */}
            <section id="sec-22" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">22.</span> Penghapusan Data Akun Media Sosial yang Terhubung
              </h2>
              <p>
                Apabila Anda memutus integrasi akun TikTok atau Meta/Instagram dari WedSiap, seluruh token otorisasi yang tersimpan di sistem Kami akan segera dihapus dan dihancurkan secara otomatis.
              </p>
            </section>

            {/* 23. Transfer Data Lintas Batas */}
            <section id="sec-23" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">23.</span> Transfer Data Lintas Batas
              </h2>
              <p>
                Karena WedSiap menggunakan penyedia infrastruktur cloud global seperti Supabase dan Vercel, data Anda dapat disimpan pada server tepercaya yang berlokasi di luar wilayah Republik Indonesia. Seluruh transfer data dilakukan dengan standar enkripsi aman yang mematuhi ketentuan UU PDP.
              </p>
            </section>

            {/* 24. Privasi Anak di Bawah Umur */}
            <section id="sec-24" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">24.</span> Privasi Anak di Bawah Umur
              </h2>
              <p>
                Layanan WedSiap ditujukan khusus untuk individu yang berusia minimal 18 (delapan belas) tahun atau telah memenuhi batas usia hukum pernikahan di Indonesia. Kami tidak secara sengaja mengumpulkan data dari anak di bawah umur.
              </p>
            </section>

            {/* 25. Perubahan Kebijakan Privasi */}
            <section id="sec-25" className="scroll-mt-28 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 border-b border-beige flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">25.</span> Perubahan Kebijakan Privasi ini
              </h2>
              <p>
                Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu untuk menyesuaikan dengan perkembangan fitur aplikasi atau perubahan hukum yang berlaku. Setiap perubahan akan dipublikasikan pada halaman ini dengan menyertakan tanggal &quot;Berlaku Efektif&quot; yang diperbarui.
              </p>
            </section>

            {/* 26. Informasi Kontak Privasi */}
            <section id="sec-26" className="scroll-mt-28 space-y-4 pt-4 border-t border-beige">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal pb-2 flex items-center gap-2">
                <span className="text-burgundy font-sans text-lg">26.</span> Informasi Kontak & Penanggung Jawab Privasi
              </h2>
              <p>
                Apabila Anda memiliki pertanyaan, keluhan, atau permintaan terkait pelaksanaan Kebijakan Privasi ini, Anda dapat menghubungi Penanggung Jawab Privasi Data Kami melalui:
              </p>

              <div className="bg-burgundy-50/70 border border-burgundy-200/80 rounded-2xl p-5 space-y-2 text-charcoal-800">
                <p className="font-bold text-burgundy-900 text-base">{legalConfig.legalEntityName}</p>
                <p className="text-xs sm:text-sm"><strong>Alamat:</strong> {legalConfig.legalEntityAddress}</p>
                <p className="text-xs sm:text-sm"><strong>Email Kontak Privasi:</strong> <a href={`mailto:${legalConfig.privacyEmail}`} className="text-burgundy underline hover:text-burgundy-800">{legalConfig.privacyEmail}</a></p>
                <p className="text-xs sm:text-sm"><strong>Email Dukungan Pelanggan:</strong> <a href={`mailto:${legalConfig.legalContactEmail}`} className="text-burgundy underline hover:text-burgundy-800">{legalConfig.legalContactEmail}</a></p>
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

export default PrivacyPolicyPage;
