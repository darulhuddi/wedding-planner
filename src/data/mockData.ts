export interface WeddingData {
  coupleName: string;
  partner1: string;
  partner2: string;
  weddingDate: string;
  formattedDate: string;
  daysRemaining: number;
  progressPercent: number;
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  upcomingTasksCount: number;
}

export interface Task {
  id: string;
  title: string;
  category: 'Catering' | 'Undangan' | 'MUA' | 'Dekorasi' | 'Venue' | 'Dokumentasi' | 'Administrasi';
  dueDate: string;
  dueInDays: string;
  isUrgent?: boolean;
  isCompleted: boolean;
  assignedTo?: string;
  amount?: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  percentage: number;
  status: 'Lunas' | 'DP Dibayar' | 'Belum Dibayar' | 'On Track';
  vendorName?: string;
}

export interface TimelinePhase {
  id: string;
  title: string;
  period: string;
  isCurrent?: boolean;
  isCompleted?: boolean;
  description: string;
}

export const WEDDING_DATA: WeddingData = {
  coupleName: "Adit & Nisa",
  partner1: "Adit",
  partner2: "Nisa",
  weddingDate: "2027-02-14",
  formattedDate: "14 Februari 2027",
  daysRemaining: 166,
  progressPercent: 68,
  totalBudget: 100000000,
  usedBudget: 72450000,
  remainingBudget: 27550000,
  upcomingTasksCount: 5,
};

export const HERO_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Bayar DP Catering (50%)",
    category: "Catering",
    dueDate: "4 Sep 2026",
    dueInDays: "3 hari lagi",
    isUrgent: true,
    isCompleted: false,
    assignedTo: "Adit",
    amount: 12500000
  },
  {
    id: "task-2",
    title: "Finalisasi daftar tamu & undangan digital",
    category: "Undangan",
    dueDate: "6 Sep 2026",
    dueInDays: "5 hari lagi",
    isUrgent: false,
    isCompleted: false,
    assignedTo: "Nisa"
  },
  {
    id: "task-3",
    title: "Booking MUA & fitting busana akad",
    category: "MUA",
    dueDate: "8 Sep 2026",
    dueInDays: "7 hari lagi",
    isUrgent: false,
    isCompleted: false,
    assignedTo: "Nisa"
  }
];

export const MINGGU_INI_TASKS: Task[] = [
  {
    id: "week-1",
    title: "Bayar DP Catering",
    category: "Catering",
    dueDate: "Besok, 16:00",
    dueInDays: "Prioritas Utama",
    isUrgent: true,
    isCompleted: false,
    assignedTo: "Adit",
    amount: 12500000
  },
  {
    id: "week-2",
    title: "Finalisasi Undangan",
    category: "Undangan",
    dueDate: "Jumat, 19:00",
    dueInDays: "3 hari lagi",
    isUrgent: false,
    isCompleted: false,
    assignedTo: "Nisa"
  },
  {
    id: "week-3",
    title: "Booking Makeup",
    category: "MUA",
    dueDate: "Sabtu, 11:00",
    dueInDays: "4 hari lagi",
    isUrgent: false,
    isCompleted: false,
    assignedTo: "Adit & Nisa"
  },
  {
    id: "week-4",
    title: "Konfirmasi Dekorasi",
    category: "Dekorasi",
    dueDate: "Minggu, 14:00",
    dueInDays: "5 hari lagi",
    isUrgent: false,
    isCompleted: true,
    assignedTo: "Nisa"
  }
];

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    id: "cat-1",
    name: "Venue & Gedung",
    allocated: 40000000,
    spent: 40000000,
    percentage: 100,
    status: "Lunas",
    vendorName: "Sasana Kriya Grand Ballroom"
  },
  {
    id: "cat-2",
    name: "Catering (400 pax)",
    allocated: 25000000,
    spent: 12500000,
    percentage: 50,
    status: "DP Dibayar",
    vendorName: "Puspa Catering Nusantara"
  },
  {
    id: "cat-3",
    name: "Dekorasi Pelaminan & Area",
    allocated: 15000000,
    spent: 7500000,
    percentage: 50,
    status: "DP Dibayar",
    vendorName: "Rona Wedding Decor"
  },
  {
    id: "cat-4",
    name: "Photography & Videography",
    allocated: 10000000,
    spent: 6000000,
    percentage: 60,
    status: "DP Dibayar",
    vendorName: "Cerita Kita Studio"
  },
  {
    id: "cat-5",
    name: "Makeup (MUA) & Busana",
    allocated: 10000000,
    spent: 6450000,
    percentage: 64.5,
    status: "DP Dibayar",
    vendorName: "Griya MUA Official"
  }
];

export const TIMELINE_PIPELINE: TimelinePhase[] = [
  {
    id: "phase-1",
    title: "Venue & Tanggal",
    period: "Bulan 1–2",
    isCompleted: true,
    description: "Kunci tanggal dan gedung utama"
  },
  {
    id: "phase-2",
    title: "Vendor Utama",
    period: "Bulan 3–4",
    isCurrent: true,
    description: "Catering, MUA, Photo & Dekorasi"
  },
  {
    id: "phase-3",
    title: "Invitations & Tamu",
    period: "Bulan 5",
    description: "Daftar tamu, souvenir & undangan web"
  },
  {
    id: "phase-4",
    title: "Final Check",
    period: "Bulan 6 (H-14)",
    description: "Technical meeting & pelunasan akhir"
  },
  {
    id: "phase-5",
    title: "Wedding Day",
    period: "Hari-H",
    description: "Akad & Resepsi 14 Feb 2027"
  }
];

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount).replace('IDR', 'Rp');
};
