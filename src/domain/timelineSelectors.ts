import { TaskItem } from '../types/checklist';
import { formatIndonesianDate, getDaysUntilWedding } from './workspaceSelectors';

export interface TimelineGroup {
  key: string;
  label: string;
  subtitle?: string;
  isOverdue?: boolean;
  isWeddingDay?: boolean;
  isNoDeadline?: boolean;
  tasks: TaskItem[];
}

export interface TimelineSummary {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  thisWeekTasks: number;
  weddingDateFormatted: string;
  daysUntilWedding: number;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysYMD(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatMonthYearLabel(yearMonthStr: string): string {
  // yearMonthStr is YYYY-MM
  const [year, month] = yearMonthStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || month;
  return `${monthName} ${year}`;
}

/**
 * Derived selector to group tasks for Timeline v1.
 * Pure function: takes canonical TaskItem[] and weddingDate string.
 *
 * Precedence Rule:
 * FIRST check: dueDate === workspace.weddingDate -> group as WEDDING_DAY.
 * Only if false evaluate: OVERDUE, THIS_WEEK, UPCOMING, FUTURE, NO_DEADLINE.
 */
export function getTimelineGroups(
  tasks: TaskItem[],
  weddingDate: string,
  today: string = getTodayYMD()
): TimelineGroup[] {
  const endOfWeek = addDaysYMD(today, 7);
  const endOf30Days = addDaysYMD(today, 30);

  const overdue: TaskItem[] = [];
  const thisWeek: TaskItem[] = [];
  const upcoming: TaskItem[] = [];
  const weddingDay: TaskItem[] = [];
  const noDeadline: TaskItem[] = [];
  const monthGroupsMap: Record<string, TaskItem[]> = {};

  const byDueAndPriority = (a: TaskItem, b: TaskItem) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    const weight = { high: 0, medium: 1, low: 2 };
    return weight[a.priority] - weight[b.priority];
  };

  for (const task of tasks) {
    if (!task.dueDate) {
      noDeadline.push(task);
      continue;
    }

    // FIRST check: dueDate === weddingDate
    if (weddingDate && task.dueDate === weddingDate) {
      weddingDay.push(task);
      continue;
    }

    // Secondary checks
    if (task.dueDate < today) {
      if (task.status !== 'completed') {
        overdue.push(task);
      } else {
        // Completed past task -> group by month
        const ym = task.dueDate.slice(0, 7);
        if (!monthGroupsMap[ym]) monthGroupsMap[ym] = [];
        monthGroupsMap[ym].push(task);
      }
      continue;
    }

    if (task.dueDate <= endOfWeek) {
      thisWeek.push(task);
      continue;
    }

    if (task.dueDate <= endOf30Days) {
      upcoming.push(task);
      continue;
    }

    // Future tasks (> 30 days)
    const ym = task.dueDate.slice(0, 7);
    if (!monthGroupsMap[ym]) monthGroupsMap[ym] = [];
    monthGroupsMap[ym].push(task);
  }

  const result: TimelineGroup[] = [];

  const addOverdue = () => {
    if (overdue.length > 0) {
      result.push({
        key: 'overdue',
        label: 'Terlambat',
        isOverdue: true,
        tasks: overdue.sort(byDueAndPriority),
      });
    }
  };

  const addThisWeek = () => {
    if (thisWeek.length > 0) {
      result.push({
        key: 'this_week',
        label: 'Minggu Ini',
        tasks: thisWeek.sort(byDueAndPriority),
      });
    }
  };

  const addUpcoming = () => {
    if (upcoming.length > 0) {
      result.push({
        key: 'upcoming',
        label: 'Berikutnya',
        subtitle: '8 – 30 hari ke depan',
        tasks: upcoming.sort(byDueAndPriority),
      });
    }
  };

  const addWeddingDay = () => {
    if (weddingDay.length > 0) {
      result.push({
        key: 'wedding_day',
        label: 'Hari-H Pernikahan',
        subtitle: formatIndonesianDate(weddingDate),
        isWeddingDay: true,
        tasks: weddingDay.sort(byDueAndPriority),
      });
    }
  };

  addOverdue();

  if (weddingDate && weddingDate < today) {
    addWeddingDay();
    addThisWeek();
    addUpcoming();
  } else if (weddingDate && weddingDate <= endOfWeek) {
    addThisWeek();
    addWeddingDay();
    addUpcoming();
  } else if (weddingDate && weddingDate <= endOf30Days) {
    addThisWeek();
    addUpcoming();
    addWeddingDay();
  } else {
    addThisWeek();
    addUpcoming();
  }

  // Month groups
  const weddingMonth = weddingDate ? weddingDate.slice(0, 7) : '';
  const sortedMonthKeys = Object.keys(monthGroupsMap).sort();

  let weddingDayAdded = weddingDay.length === 0 || result.some((g) => g.key === 'wedding_day');

  for (const ym of sortedMonthKeys) {
    if (!weddingDayAdded && weddingMonth && ym >= weddingMonth) {
      addWeddingDay();
      weddingDayAdded = true;
    }
    result.push({
      key: `month_${ym}`,
      label: formatMonthYearLabel(ym),
      tasks: monthGroupsMap[ym].sort(byDueAndPriority),
    });
  }

  if (!weddingDayAdded) {
    addWeddingDay();
  }

  if (noDeadline.length > 0) {
    result.push({
      key: 'no_deadline',
      label: 'Belum Ada Deadline',
      isNoDeadline: true,
      tasks: noDeadline,
    });
  }

  return result;
}

export function getTimelineSummary(
  tasks: TaskItem[],
  weddingDate: string,
  today: string = getTodayYMD()
): TimelineSummary {
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status !== 'completed').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.dueDate !== null &&
      t.dueDate !== weddingDate &&
      t.dueDate < today
  ).length;

  const endOfWeek = addDaysYMD(today, 7);
  const thisWeekTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.dueDate !== null &&
      t.dueDate !== weddingDate &&
      t.dueDate >= today &&
      t.dueDate <= endOfWeek
  ).length;

  return {
    totalTasks,
    activeTasks,
    completedTasks,
    overdueTasks,
    thisWeekTasks,
    weddingDateFormatted: formatIndonesianDate(weddingDate),
    daysUntilWedding: getDaysUntilWedding(weddingDate),
  };
}
