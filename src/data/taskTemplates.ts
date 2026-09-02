import { TaskTemplate } from '../types/checklist';

/**
 * WedFlow Task Template Library
 *
 * Templates are the source material for generating personalized workspace tasks.
 * They are NEVER shown directly to users — workspace tasks are generated from them.
 *
 * requiresIncompleteCategory: only generate this task if the user has NOT completed that category
 * (no prop = always generate)
 */
export const TASK_TEMPLATES: TaskTemplate[] = [
  // ── UMUM ──────────────────────────────────────────────────────────────
  {
    templateId: 'general-concept',
    title: 'Tentukan konsep pernikahan',
    description: 'Diskusikan tema, nuansa, dan gaya resepsi yang kamu inginkan bersama pasangan.',
    category: 'general',
    defaultPriority: 'high',
  },
  {
    templateId: 'general-priority',
    title: 'Susun prioritas persiapan',
    description: 'Buat daftar urutan hal yang perlu diselesaikan terlebih dahulu.',
    category: 'general',
    defaultPriority: 'high',
  },
  {
    templateId: 'general-family',
    title: 'Koordinasi dengan keluarga',
    description: 'Diskusikan rencana pernikahan dan ekspektasi bersama kedua keluarga.',
    category: 'general',
    defaultPriority: 'medium',
  },
  {
    templateId: 'general-budget-plan',
    title: 'Bagi budget ke kategori utama',
    description: 'Tentukan alokasi anggaran untuk venue, catering, dekorasi, dokumentasi, dll.',
    category: 'general',
    defaultPriority: 'high',
  },

  // ── VENUE ─────────────────────────────────────────────────────────────
  {
    templateId: 'venue-needs',
    title: 'Tentukan kebutuhan venue',
    description: 'Hitung estimasi kapasitas tamu, akses parkir, dan fasilitas yang dibutuhkan.',
    category: 'venue',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'venue',
  },
  {
    templateId: 'venue-shortlist',
    title: 'Buat shortlist venue',
    description: 'Kumpulkan minimal 3–5 pilihan venue sesuai kapasitas dan budget.',
    category: 'venue',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'venue',
  },
  {
    templateId: 'venue-contact',
    title: 'Hubungi venue pilihan',
    description: 'Kirim pertanyaan dan minta detail paket, ketersediaan tanggal, dan harga.',
    category: 'venue',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'venue',
  },
  {
    templateId: 'venue-survey',
    title: 'Jadwalkan survei venue',
    description: 'Kunjungi langsung venue pilihan untuk melihat kondisi dan fasilitas.',
    category: 'venue',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'venue',
  },
  {
    templateId: 'venue-compare',
    title: 'Bandingkan paket venue',
    description: 'Buat perbandingan harga, fasilitas, dan syarat dari tiap venue.',
    category: 'venue',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'venue',
  },
  {
    templateId: 'venue-negotiate',
    title: 'Negosiasi harga venue',
    description: 'Diskusikan kemungkinan diskon, penambahan fasilitas, atau fleksibilitas paket.',
    category: 'venue',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'venue',
  },
  {
    templateId: 'venue-lock',
    title: 'Kunci venue dengan DP',
    description: 'Tandatangani kontrak dan bayar down payment untuk mengamankan tanggal.',
    category: 'venue',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'venue',
  },

  // ── CATERING ──────────────────────────────────────────────────────────
  {
    templateId: 'catering-needs',
    title: 'Tentukan kebutuhan catering',
    description: 'Hitung estimasi jumlah porsi, jenis sajian, dan budget maksimum catering.',
    category: 'catering',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'catering',
  },
  {
    templateId: 'catering-search',
    title: 'Cari vendor catering',
    description: 'Kumpulkan rekomendasi catering dari teman, keluarga, atau platform online.',
    category: 'catering',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'catering',
  },
  {
    templateId: 'catering-compare',
    title: 'Bandingkan paket catering',
    description: 'Minta proposal dari minimal 3 vendor dan bandingkan harga per porsi.',
    category: 'catering',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'catering',
  },
  {
    templateId: 'catering-testfood',
    title: 'Jadwalkan test food',
    description: 'Cicip menu catering pilihan sebelum memutuskan untuk kontrak.',
    category: 'catering',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'catering',
  },
  {
    templateId: 'catering-menu',
    title: 'Konfirmasi menu final',
    description: 'Finalisasi daftar menu, jumlah porsi, dan kebutuhan khusus (vegetarian, dll).',
    category: 'catering',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'catering',
  },
  {
    templateId: 'catering-dp',
    title: 'Bayar DP catering',
    description: 'Bayar down payment sesuai kesepakatan dan simpan bukti pembayaran.',
    category: 'catering',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'catering',
  },

  // ── FOTO & VIDEO ───────────────────────────────────────────────────────
  {
    templateId: 'photo-search',
    title: 'Cari fotografer & videografer',
    description: 'Kumpulkan portofolio dari beberapa fotografer sesuai gaya yang kamu inginkan.',
    category: 'photography',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'photography',
  },
  {
    templateId: 'photo-compare',
    title: 'Bandingkan portofolio & paket',
    description: 'Evaluasi gaya foto, kualitas video, paket harga, dan ketersediaan tanggal.',
    category: 'photography',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'photography',
  },
  {
    templateId: 'photo-package',
    title: 'Tentukan paket foto & video',
    description: 'Pilih paket yang mencakup prewedding, akad, dan resepsi sesuai kebutuhan.',
    category: 'photography',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'photography',
  },
  {
    templateId: 'photo-booking',
    title: 'Booking fotografer',
    description: 'Tandatangani kontrak dan bayar DP untuk mengamankan jadwal dokumentasi.',
    category: 'photography',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'photography',
  },

  // ── DEKORASI ──────────────────────────────────────────────────────────
  {
    templateId: 'decor-concept',
    title: 'Tentukan konsep dekorasi',
    description: 'Diskusikan tema warna, gaya pelaminan, dan suasana yang ingin ditampilkan.',
    category: 'decoration',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'decoration',
  },
  {
    templateId: 'decor-search',
    title: 'Cari vendor dekorasi',
    description: 'Kumpulkan referensi dan rekomendasi dekorator sesuai konsep pernikahan.',
    category: 'decoration',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'decoration',
  },
  {
    templateId: 'decor-shortlist',
    title: 'Buat shortlist dekorator',
    description: 'Pilih 2–3 vendor dekorasi untuk dibandingkan portofolio dan paketnya.',
    category: 'decoration',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'decoration',
  },
  {
    templateId: 'decor-discuss',
    title: 'Diskusikan konsep dekorasi',
    description: 'Presentasikan referensi dan diskusikan realisasinya dengan vendor pilihan.',
    category: 'decoration',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'decoration',
  },

  // ── MUA & BUSANA ──────────────────────────────────────────────────────
  {
    templateId: 'makeup-concept',
    title: 'Tentukan konsep busana',
    description: 'Pilih gaya busana akad dan resepsi — modern, tradisional, atau fusion.',
    category: 'makeup_attire',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'makeup_attire',
  },
  {
    templateId: 'makeup-search-mua',
    title: 'Cari MUA pengantin',
    description: 'Kumpulkan portofolio dan review dari MUA sesuai gaya riasmu.',
    category: 'makeup_attire',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'makeup_attire',
  },
  {
    templateId: 'makeup-search-attire',
    title: 'Cari vendor busana pengantin',
    description: 'Survei wedding gallery atau rental busana untuk pilihan gaun dan baju pengantin.',
    category: 'makeup_attire',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'makeup_attire',
  },
  {
    templateId: 'makeup-fitting',
    title: 'Jadwalkan fitting busana',
    description: 'Lakukan fitting awal untuk memastikan ukuran dan kenyamanan busana.',
    category: 'makeup_attire',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'makeup_attire',
  },

  // ── UNDANGAN ──────────────────────────────────────────────────────────
  {
    templateId: 'invite-guestlist',
    title: 'Tentukan daftar tamu awal',
    description: 'Susun daftar nama tamu dari kedua keluarga dan kelompok pertemanan.',
    category: 'invitation',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'invitation',
  },
  {
    templateId: 'invite-concept',
    title: 'Tentukan konsep undangan',
    description: 'Pilih format undangan: digital, fisik, atau kombinasi keduanya.',
    category: 'invitation',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'invitation',
  },
  {
    templateId: 'invite-format',
    title: 'Pilih format undangan',
    description: 'Tentukan platform undangan digital atau vendor cetak yang akan digunakan.',
    category: 'invitation',
    defaultPriority: 'medium',
    requiresIncompleteCategory: 'invitation',
  },
  {
    templateId: 'invite-design',
    title: 'Finalisasi desain undangan',
    description: 'Review konten, desain, dan data yang tercantum di undangan sebelum disebarkan.',
    category: 'invitation',
    defaultPriority: 'high',
    requiresIncompleteCategory: 'invitation',
  },
];

export default TASK_TEMPLATES;
