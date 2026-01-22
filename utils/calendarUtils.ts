// utils/calendarUtils.ts

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
  monthName: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function generateCalendarMonth(year: number, month: number): CalendarMonth {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month's days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    days.push({
      date: new Date(year, month - 1, dayNumber),
      dayNumber,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month's days
  const today = new Date();
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const date = new Date(year, month, dayNumber);
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    days.push({
      date,
      dayNumber,
      isCurrentMonth: true,
      isToday,
    });
  }

  // Next month's days
  const remainingDays = 42 - days.length;
  for (let dayNumber = 1; dayNumber <= remainingDays; dayNumber++) {
    days.push({
      date: new Date(year, month + 1, dayNumber),
      dayNumber,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return {
    year,
    month,
    days,
    monthName: MONTH_NAMES[month],
  };
}

export function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month];
}
