'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Search,
  Users,
  User,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  BookOpen,
  FileText,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@edtech/ui';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
interface CalendarClass {
  _id: string;
  name: string;
  batchId?: { _id: string; name: string; batchCode?: string };
  courseId?: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  originalStartAt?: string;
  originalEndAt?: string;
  timezone?: string;
  instructorId?: { _id: string; name: string };
  roomId?: { _id: string; name: string; code?: string; branch?: string };
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isRescheduled?: boolean;
  source?: string;
  scheduleRevision?: number;
  zoomDetails?: { meetingUrl?: string };
}

interface ClassCalendarListProps {
  endpoint: string;
  title: string;
  subtitle?: string;
  extraActions?: React.ReactNode;
}

/* ─────────────────────────────────────────────
   Color Palettes for Courses / Categories
   ───────────────────────────────────────────── */
const COURSE_COLORS = [
  {
    id: 'blue',
    bg: 'bg-blue-50/90 dark:bg-blue-950/40',
    border: 'border-blue-300 dark:border-blue-700/60',
    text: 'text-blue-700 dark:text-blue-300',
    indicator: 'bg-blue-600',
    hover: 'hover:bg-blue-100/90 dark:hover:bg-blue-900/50',
  },
  {
    id: 'purple',
    bg: 'bg-purple-50/90 dark:bg-purple-950/40',
    border: 'border-purple-300 dark:border-purple-700/60',
    text: 'text-purple-700 dark:text-purple-300',
    indicator: 'bg-purple-600',
    hover: 'hover:bg-purple-100/90 dark:hover:bg-purple-900/50',
  },
  {
    id: 'amber',
    bg: 'bg-amber-50/90 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700/60',
    text: 'text-amber-800 dark:text-amber-300',
    indicator: 'bg-amber-600',
    hover: 'hover:bg-amber-100/90 dark:hover:bg-amber-900/50',
  },
  {
    id: 'emerald',
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    indicator: 'bg-emerald-600',
    hover: 'hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50',
  },
  {
    id: 'cyan',
    bg: 'bg-cyan-50/90 dark:bg-cyan-950/40',
    border: 'border-cyan-300 dark:border-cyan-700/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    indicator: 'bg-cyan-600',
    hover: 'hover:bg-cyan-100/90 dark:hover:bg-cyan-900/50',
  },
  {
    id: 'rose',
    bg: 'bg-rose-50/90 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-700/60',
    text: 'text-rose-700 dark:text-rose-300',
    indicator: 'bg-rose-600',
    hover: 'hover:bg-rose-100/90 dark:hover:bg-rose-900/50',
  },
];

function getCourseColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function dateKey(d: Date | string): string {
  const dt = new Date(d);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ═════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════ */
export function ClassCalendarList({
  endpoint,
  title,
  subtitle = 'Academic timeline and scheduled sessions.',
  extraActions,
}: ClassCalendarListProps) {
  // Navigation & View mode — Month view is default (Canvas LMS style)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [selectedClass, setSelectedClass] = useState<CalendarClass | null>(null);

  // Filter states
  const [selectedCalendars, setSelectedCalendars] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // 90-day query bounds centered around current month
  const queryBounds = useMemo(() => {
    const from = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [currentDate]);

  const query = useQuery({
    queryKey: ['academic-calendar', endpoint, queryBounds.from, queryBounds.to],
    queryFn: async () => {
      const url = `${endpoint}?from=${encodeURIComponent(queryBounds.from)}&to=${encodeURIComponent(queryBounds.to)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Unable to load calendar classes');
      const json = await res.json();
      return (json.data || []) as CalendarClass[];
    },
  });

  // Extract distinct calendars / batches for right sidebar filter
  const calendarCategories = useMemo(() => {
    if (!query.data) return [];
    const map = new Map<string, { id: string; name: string; count: number; color: typeof COURSE_COLORS[0] }>();

    for (const cls of query.data) {
      const key = cls.batchId?.name || 'General Classes';
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: key,
          count: 0,
          color: getCourseColor(key),
        });
      }
      map.get(key)!.count += 1;
    }
    return Array.from(map.values());
  }, [query.data]);

  // Initialize selectedCalendars when categories load
  useEffect(() => {
    if (calendarCategories.length > 0 && Object.keys(selectedCalendars).length === 0) {
      const init: Record<string, boolean> = {};
      calendarCategories.forEach((cat) => {
        init[cat.id] = true;
      });
      setSelectedCalendars(init);
    }
  }, [calendarCategories, selectedCalendars]);

  const toggleCalendarFilter = (id: string) => {
    setSelectedCalendars((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  // Filtered classes
  const filteredClasses = useMemo(() => {
    if (!query.data) return [];
    return query.data.filter((cls) => {
      const catKey = cls.batchId?.name || 'General Classes';
      if (selectedCalendars[catKey] === false) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          cls.name.toLowerCase().includes(q) ||
          cls.batchId?.name.toLowerCase().includes(q) ||
          cls.instructorId?.name.toLowerCase().includes(q) ||
          cls.roomId?.name.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [query.data, selectedCalendars, searchQuery]);

  // Next Upcoming Class for Quick Join
  const nextUpcomingClass = useMemo(() => {
    const now = new Date();
    return filteredClasses
      .filter((c) => new Date(c.scheduledEndAt) > now && c.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime())[0];
  }, [filteredClasses]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  const handleNext = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Title for main calendar: "October 2026"
  const formattedHeaderTitle = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto">
      {/* ──────────────── Top Navigation Bar ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
        {/* Left: Today, Prev/Next, Month Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            Today
          </button>

          <div className="flex items-center rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <button
              onClick={handlePrev}
              aria-label="Previous month"
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="w-[1px] h-4 bg-border" />
            <button
              onClick={handleNext}
              aria-label="Next month"
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground ml-1">
            {formattedHeaderTitle}
          </h2>
        </div>

        {/* Right: View Tabs + Extra Actions */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle: [ Week | Month | Agenda ] */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'agenda'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Agenda
            </button>
          </div>

          {extraActions && <div>{extraActions}</div>}
        </div>
      </div>

      {/* ──────────────── Main Two-Column Layout ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* LEFT / CENTER: Full Calendar Grid (lg:col-span-9 or col-span-12) */}
        <div className="lg:col-span-9 xl:col-span-9 flex flex-col">
          {viewMode === 'month' && (
            <MonthCalendarGrid
              currentDate={currentDate}
              classes={filteredClasses}
              onSelectClass={setSelectedClass}
            />
          )}

          {viewMode === 'week' && (
            <WeekCalendarGrid
              currentDate={currentDate}
              classes={filteredClasses}
              onSelectClass={setSelectedClass}
            />
          )}

          {viewMode === 'agenda' && (
            <AgendaCalendarView
              currentDate={currentDate}
              classes={filteredClasses}
              onSelectClass={setSelectedClass}
            />
          )}
        </div>

        {/* RIGHT SIDEBAR: Mini Calendar + Actions + Course Filters (lg:col-span-3) */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-5">
          {/* 1. Mini Datepicker Calendar */}
          <MiniCalendarWidget
            currentDate={currentDate}
            onSelectDate={(newDate) => {
              setCurrentDate(newDate);
            }}
          />

          {/* 2. Quick Appointments / Upcoming Action */}
          {nextUpcomingClass && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Next Session
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {nextUpcomingClass.mode}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground line-clamp-1">{nextUpcomingClass.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatFullDate(nextUpcomingClass.scheduledStartAt)} · {formatTime(nextUpcomingClass.scheduledStartAt)}
                </p>
              </div>

              {nextUpcomingClass.zoomDetails?.meetingUrl ? (
                <a
                  href={nextUpcomingClass.zoomDetails.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join Live Class
                </a>
              ) : (
                <button
                  onClick={() => setSelectedClass(nextUpcomingClass)}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors"
                >
                  View Details
                </button>
              )}
            </div>
          )}

          {/* 3. Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search classes or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-sm"
            />
          </div>

          {/* 4. CALENDARS / COURSES FILTER LIST (Canvas Style) */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> CALENDARS
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {calendarCategories.length} active
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {calendarCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No batch calendars loaded</p>
              ) : (
                calendarCategories.map((cat) => {
                  const isChecked = selectedCalendars[cat.id] !== false;
                  return (
                    <label
                      key={cat.id}
                      onClick={() => toggleCalendarFilter(cat.id)}
                      className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors select-none"
                    >
                      {/* Checkbox with Category Color */}
                      <div
                        className={`h-4 w-4 rounded-[4px] flex items-center justify-center transition-all ${
                          isChecked
                            ? `${cat.color.indicator} text-white shadow-sm`
                            : 'border border-border bg-card'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <span className="truncate flex-1 font-medium">{cat.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({cat.count})</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── Details Drawer Modal ──────────────── */}
      {selectedClass && (
        <ClassDetailModal cls={selectedClass} onClose={() => setSelectedClass(null)} />
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════
   FULL MONTH CALENDAR GRID (Canvas / Google Calendar Style)
   ═════════════════════════════════════════════ */
function MonthCalendarGrid({
  currentDate,
  classes,
  onSelectClass,
}: {
  currentDate: Date;
  classes: CalendarClass[];
  onSelectClass: (cls: CalendarClass) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Compute days for 7-column grid starting Sunday (SUN, MON, TUE, WED, THU, FRI, SAT)
  const days = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const list: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from prev month (Sunday = 0)
    const startDay = firstDayOfMonth.getDay();
    for (let i = startDay; i > 0; i--) {
      list.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      list.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = 7 - (list.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        list.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return list;
  }, [year, month]);

  const todayStr = dateKey(new Date());

  // Group classes by date
  const classesByDate = useMemo(() => {
    const map = new Map<string, CalendarClass[]>();
    for (const c of classes) {
      const dk = dateKey(c.scheduledStartAt);
      if (!map.has(dk)) map.set(dk, []);
      map.get(dk)!.push(c);
    }
    return map;
  }, [classes]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Weekday Header Row: SUN, MON, TUE, WED, THU, FRI, SAT */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground tracking-wider py-2.5">
        {WEEKDAYS.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* 5 or 6 Rows Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dk = dateKey(date);
          const isToday = dk === todayStr;
          const dayClasses = classesByDate.get(dk) || [];

          return (
            <div
              key={idx}
              className={`min-h-[125px] sm:min-h-[140px] p-2 flex flex-col transition-colors ${
                !isCurrentMonth ? 'bg-muted/15 text-muted-foreground/50' : 'bg-card'
              } ${isToday ? 'bg-primary/[0.03]' : ''}`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center h-6 w-6 rounded-md ${
                    isToday
                      ? 'bg-primary text-primary-foreground font-black shadow-sm'
                      : isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {date.getDate()}
                </span>

                {dayClasses.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono font-medium">
                    {dayClasses.length} {dayClasses.length === 1 ? 'event' : 'events'}
                  </span>
                )}
              </div>

              {/* Event Chips (Canvas LMS Style Cards) */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayClasses.slice(0, 3).map((cls) => {
                  const catName = cls.batchId?.name || 'General Classes';
                  const color = getCourseColor(catName);
                  const time = formatTime(cls.scheduledStartAt);

                  return (
                    <button
                      key={cls._id}
                      onClick={() => onSelectClass(cls)}
                      className={`w-full text-left p-1.5 rounded-[6px] border text-[11px] font-medium transition-all shadow-xs flex items-center gap-1.5 truncate ${color.bg} ${color.border} ${color.text} ${color.hover}`}
                    >
                      {/* Icon */}
                      {cls.mode === 'ONLINE' ? (
                        <Video className="h-3 w-3 flex-shrink-0 opacity-80" />
                      ) : cls.mode === 'OFFLINE' ? (
                        <MapPin className="h-3 w-3 flex-shrink-0 opacity-80" />
                      ) : (
                        <FileText className="h-3 w-3 flex-shrink-0 opacity-80" />
                      )}

                      {/* Title + Time */}
                      <span className="truncate flex-1">
                        <span className="opacity-75 font-mono text-[10px] mr-1">{time}</span>
                        {cls.name}
                      </span>
                    </button>
                  );
                })}

                {/* More indicator */}
                {dayClasses.length > 3 && (
                  <button
                    onClick={() => onSelectClass(dayClasses[3])}
                    className="text-[10px] font-bold text-primary hover:underline px-1 py-0.5 text-left w-full block"
                  >
                    +{dayClasses.length - 3} more...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   WEEK CALENDAR GRID
   ═════════════════════════════════════════════ */
function WeekCalendarGrid({
  currentDate,
  classes,
  onSelectClass,
}: {
  currentDate: Date;
  classes: CalendarClass[];
  onSelectClass: (cls: CalendarClass) => void;
}) {
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const sundayOffset = curr.getDay(); // 0 is Sunday
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - sundayOffset);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const todayStr = dateKey(new Date());

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center py-3">
        {weekDays.map((day) => {
          const dk = dateKey(day);
          const isToday = dk === todayStr;
          return (
            <div key={dk} className="space-y-0.5">
              <div className="text-[11px] font-bold uppercase text-muted-foreground">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-base font-black inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                  isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 divide-x divide-border min-h-[500px]">
        {weekDays.map((day) => {
          const dk = dateKey(day);
          const dayClasses = classes.filter((c) => dateKey(c.scheduledStartAt) === dk);

          return (
            <div key={dk} className="p-2 space-y-2 bg-card">
              {dayClasses.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 italic">
                  No sessions
                </div>
              ) : (
                dayClasses.map((cls) => {
                  const catName = cls.batchId?.name || 'General Classes';
                  const color = getCourseColor(catName);

                  return (
                    <button
                      key={cls._id}
                      onClick={() => onSelectClass(cls)}
                      className={`w-full text-left p-2 rounded-lg border text-xs font-medium space-y-1 transition-all shadow-xs ${color.bg} ${color.border} ${color.text} ${color.hover}`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                        <span>{formatTime(cls.scheduledStartAt)}</span>
                        <span>{cls.mode}</span>
                      </div>
                      <div className="font-bold line-clamp-2 leading-tight">{cls.name}</div>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   AGENDA CALENDAR VIEW
   ═════════════════════════════════════════════ */
function AgendaCalendarView({
  currentDate,
  classes,
  onSelectClass,
}: {
  currentDate: Date;
  classes: CalendarClass[];
  onSelectClass: (cls: CalendarClass) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarClass[]>();
    for (const c of classes) {
      const dk = dateKey(c.scheduledStartAt);
      if (!map.has(dk)) map.set(dk, []);
      map.get(dk)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [classes]);

  const todayStr = dateKey(new Date());

  if (grouped.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-border bg-card space-y-2">
        <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto" />
        <h3 className="font-bold text-foreground">No Classes Scheduled</h3>
        <p className="text-xs text-muted-foreground">No events found in this date range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dk, dayClasses]) => {
        const dObj = new Date(`${dk}T00:00:00`);
        const isToday = dk === todayStr;

        return (
          <div key={dk} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border/70 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                {isToday && <span className="text-xs font-bold text-primary uppercase">Today</span>}
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {dayClasses.map((cls) => {
                const catName = cls.batchId?.name || 'General Classes';
                const color = getCourseColor(catName);

                return (
                  <button
                    key={cls._id}
                    onClick={() => onSelectClass(cls)}
                    className={`text-left p-3 rounded-lg border text-xs space-y-1.5 transition-all shadow-xs ${color.bg} ${color.border} ${color.text} ${color.hover}`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] opacity-80">
                      <span>{formatTime(cls.scheduledStartAt)} – {formatTime(cls.scheduledEndAt)}</span>
                      <span className="font-bold uppercase">{cls.mode}</span>
                    </div>
                    <div className="font-bold text-sm leading-snug line-clamp-2">{cls.name}</div>
                    {cls.instructorId?.name && (
                      <div className="text-[11px] opacity-80 truncate">
                        By {cls.instructorId.name}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════════════════════════════════
   MINI CALENDAR DATE PICKER (Right Sidebar)
   ═════════════════════════════════════════════ */
function MiniCalendarWidget({
  currentDate,
  onSelectDate,
}: {
  currentDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [pickerDate, setPickerDate] = useState<Date>(new Date(currentDate));

  const year = pickerDate.getFullYear();
  const month = pickerDate.getMonth();

  const handleMiniPrev = () => {
    setPickerDate(new Date(year, month - 1, 1));
  };

  const handleMiniNext = () => {
    setPickerDate(new Date(year, month + 1, 1));
  };

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const list: { date: Date; isCurrentMonth: boolean }[] = [];
    const startDay = firstDay.getDay(); // Sunday = 0

    for (let i = startDay; i > 0; i--) {
      list.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      list.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 7 - (list.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        list.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }
    return list;
  }, [year, month]);

  const activeDayStr = dateKey(currentDate);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Header: < Month Year > */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handleMiniPrev}
          aria-label="Previous month"
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-xs font-bold text-foreground">
          {pickerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>

        <button
          onClick={handleMiniNext}
          aria-label="Next month"
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers: S M T W T F S */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground mb-1">
        <span>S</span>
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dk = dateKey(date);
          const isSelected = dk === activeDayStr;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`h-7 w-7 text-[11px] rounded-md mx-auto flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : isCurrentMonth
                  ? 'text-foreground hover:bg-muted font-medium'
                  : 'text-muted-foreground/30 hover:bg-muted/40'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   CLASS DETAIL MODAL / DRAWER
   ═════════════════════════════════════════════ */
function ClassDetailModal({ cls, onClose }: { cls: CalendarClass; onClose: () => void }) {
  const catName = cls.batchId?.name || 'General Classes';
  const color = getCourseColor(catName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-white dark:bg-[#121622] text-foreground p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="space-y-2 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                cls.status === 'CANCELLED'
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : cls.isRescheduled
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              }`}
            >
              {cls.status}
              {cls.isRescheduled ? ' · Rescheduled' : ''}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-foreground border border-border">
              {cls.mode}
            </span>
          </div>

          <h3 className="text-xl font-bold text-foreground">{cls.name}</h3>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-[#1A2030] space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Date
            </span>
            <span className="font-bold text-foreground block">
              {formatFullDate(cls.scheduledStartAt)}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-[#1A2030] space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
              <Clock className="h-3.5 w-3.5 text-primary" /> Time
            </span>
            <span className="font-bold text-foreground font-mono block">
              {formatTime(cls.scheduledStartAt)} – {formatTime(cls.scheduledEndAt)}
            </span>
          </div>

          {cls.batchId && (
            <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-[#1A2030] space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <Users className="h-3.5 w-3.5 text-primary" /> Batch
              </span>
              <span className="font-bold text-foreground block truncate">
                {cls.batchId.name} {cls.batchId.batchCode ? `(${cls.batchId.batchCode})` : ''}
              </span>
            </div>
          )}

          {cls.instructorId && (
            <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-[#1A2030] space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <User className="h-3.5 w-3.5 text-primary" /> Instructor
              </span>
              <span className="font-bold text-foreground block truncate">
                {cls.instructorId.name}
              </span>
            </div>
          )}

          {cls.roomId && (
            <div className="col-span-2 p-3 rounded-xl border border-border bg-slate-50 dark:bg-[#1A2030] space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Classroom / Branch
              </span>
              <span className="font-bold text-foreground block">
                {cls.roomId.name} {cls.roomId.code ? `(${cls.roomId.code})` : ''} {cls.roomId.branch ? `· ${cls.roomId.branch}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          {cls.zoomDetails?.meetingUrl && cls.status !== 'CANCELLED' && (
            <a
              href={cls.zoomDetails.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <Video className="h-4 w-4" />
              Join Live Meeting
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          )}
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
