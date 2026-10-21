'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  Building2,
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  MapPin,
  Sparkles,
  Laptop,
  CheckCircle2,
  Lock,
  UserCheck
} from 'lucide-react';
import { Button } from '@edtech/ui';
import { CreateClassModal } from '@/components/classes/CreateClassModal';
import { ClassRosterDrawer } from '@/components/classes/ClassRosterDrawer';

export default function AdminClassesPage() {
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'FULL'>('ALL');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [rosterClass, setRosterClass] = useState<any | null>(null);

  // Fetch Classes
  const { data: classesData, isLoading, error } = useQuery({
    queryKey: ['admin-classes', modeFilter, availabilityFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (modeFilter !== 'ALL') params.append('mode', modeFilter);
      if (availabilityFilter === 'FULL') params.append('isFull', 'true');
      if (availabilityFilter === 'AVAILABLE') params.append('isFull', 'false');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '50');

      const res = await fetch(`/api/v1/classes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch classes');
      return res.json();
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/classes/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error?.message || 'Failed to delete class');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete class');
    }
  });

  const classes: any[] = classesData?.data || [];
  const stats = classesData?.stats || {
    totalClasses: 0,
    onlineClasses: 0,
    offlineClasses: 0,
    totalSeats: 0,
    enrolledSeats: 0,
    availableSeats: 0,
    fullClassesCount: 0
  };

  const overallOccupancy = stats.totalSeats > 0 ? Math.round((stats.enrolledSeats / stats.totalSeats) * 100) : 0;

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--brand-text)]">
              Classes & Classrooms
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
              Capacity Capped
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Create and schedule Online (Zoom) virtual rooms and In-Person campus labs with strict seat capacity limits.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingClass(null);
            setIsCreateOpen(true);
          }}
          className="btn-primary text-xs px-5 py-2.5 shadow-lg shadow-[#BE1E2E]/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Class</span>
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold">Total Classes</span>
            <Building2 className="w-4 h-4 text-[#BE1E2E]" />
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)] font-mono">
            {stats.totalClasses}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Active cohorts</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-xs font-semibold">Online (Zoom)</span>
            <Video className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {stats.onlineClasses}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Live meeting rooms</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-xs font-semibold">Classroom Labs</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.offlineClasses}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Campus venues</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-500">
            <span className="text-xs font-semibold">Total Seats</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {stats.enrolledSeats} / {stats.totalSeats}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono">
            {overallOccupancy}% Capacity booked
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-red-500">
            <span className="text-xs font-semibold">Full Classes</span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
            {stats.fullClassesCount}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">No seats remaining</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search class by name, code, campus branch, or room..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Filter */}
          <div className="flex items-center bg-[var(--brand-background)] p-1 rounded-xl border border-[var(--brand-border)] text-xs font-semibold">
            <button
              onClick={() => setModeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modeFilter === 'ALL'
                  ? 'bg-[#BE1E2E] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              All Modes
            </button>
            <button
              onClick={() => setModeFilter('ONLINE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                modeFilter === 'ONLINE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-blue-500'
              }`}
            >
              <Video className="w-3.5 h-3.5" /> Online (Zoom)
            </button>
            <button
              onClick={() => setModeFilter('OFFLINE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                modeFilter === 'OFFLINE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-emerald-500'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Classroom
            </button>
          </div>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none"
          >
            <option value="ALL">All Seat Statuses</option>
            <option value="AVAILABLE">Available Seats Only</option>
            <option value="FULL">Seats Full Only</option>
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[var(--text-muted)]">Loading classes and seat occupancy...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
          Failed to load classes: {(error as any).message}
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
          <Building2 className="w-12 h-12 text-[var(--text-muted)] opacity-40 mx-auto" />
          <h3 className="text-lg font-bold text-[var(--brand-text)]">No Classes Configured</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Create your first class with seat limits, Zoom room integration, or physical lab venue details.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setEditingClass(null);
              setIsCreateOpen(true);
            }}
            className="btn-primary text-xs px-5 py-2.5"
          >
            Create First Class
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const isOnline = cls.mode === 'ONLINE' || cls.mode === 'HYBRID';
            const isOffline = cls.mode === 'OFFLINE' || cls.mode === 'HYBRID';
            const capacity = cls.capacity || 25;
            const enrolledCount = cls.enrolledCount || 0;
            const seatsLeft = Math.max(0, capacity - enrolledCount);
            const isFull = enrolledCount >= capacity || cls.status === 'FULL';
            const occupancyPct = Math.min(100, Math.round((enrolledCount / capacity) * 100));

            return (
              <div
                key={cls.id}
                className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/60 shadow-md hover:shadow-xl transition-all p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                            cls.mode === 'ONLINE'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                              : cls.mode === 'OFFLINE'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                              : 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
                          }`}
                        >
                          {cls.mode === 'ONLINE' ? (
                            <Video className="w-3.5 h-3.5" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5" />
                          )}
                          {cls.mode === 'ONLINE'
                            ? 'Live Online (Zoom)'
                            : cls.mode === 'OFFLINE'
                            ? 'Classroom (Campus)'
                            : 'Hybrid'}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isFull
                              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                              : seatsLeft <= 5
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                          }`}
                        >
                          {isFull ? <Lock className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {isFull ? 'SEATS FULL' : `${seatsLeft} Seats Left`}
                        </span>
                      </div>

                      <h2 className="text-lg font-black text-[var(--brand-text)] mt-1.5">
                        {cls.name}
                      </h2>
                      {cls.course && (
                        <p className="text-xs font-semibold text-[var(--text-muted)]">
                          Course: <span className="text-[var(--brand-text)]">{cls.course.title}</span>
                        </p>
                      )}
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono font-bold text-[#BE1E2E] shrink-0">
                      {cls.classCode}
                    </span>
                  </div>

                  {/* Seat Capacity Progress Gauge */}
                  <div className="p-3.5 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#BE1E2E]" />
                        <span>Enrolled Capacity</span>
                      </span>
                      <span className="font-mono font-bold text-xs text-[var(--brand-text)]">
                        {enrolledCount} / {capacity} Seats ({occupancyPct}%)
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-red-500'
                            : seatsLeft <= 5
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-emerald-500 to-[#BE1E2E]'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Timing & Schedule */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--brand-background)]/60 p-3 rounded-2xl border border-[var(--brand-border)]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Timing</span>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[var(--brand-text)]">
                        <Clock className="w-3.5 h-3.5 text-[#BE1E2E]" />
                        {cls.timing.startTime} - {cls.timing.endTime}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Start Date</span>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[var(--brand-text)]">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(cls.startDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="col-span-2 space-y-0.5 pt-1 border-t border-[var(--brand-border)]/50">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Weekly Days</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {cls.daysOfWeek.map((d: string) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[10px] font-mono font-bold border border-[var(--brand-border)]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mode Details Box */}
                  {isOnline && cls.zoomDetails && (
                    <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                          <Video className="w-3.5 h-3.5" />
                          <span>Zoom Meeting Integration</span>
                        </div>
                        {cls.zoomDetails.meetingUrl ? (
                          <a
                            href={cls.zoomDetails.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <span>Launch Meeting</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingClass(cls);
                              setIsCreateOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                          >
                            <span>Configure Link</span>
                          </button>
                        )}
                      </div>

                      {cls.zoomDetails.meetingUrl ? (
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[var(--brand-text)]">
                          {cls.zoomDetails.meetingId && (
                            <div>
                              <span className="text-[var(--text-muted)]">ID: </span>
                              <span className="font-semibold">{cls.zoomDetails.meetingId}</span>
                            </div>
                          )}
                          {cls.zoomDetails.passcode && (
                            <div>
                              <span className="text-[var(--text-muted)]">Passcode: </span>
                              <span className="font-semibold">{cls.zoomDetails.passcode}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Zoom meeting link is pending. Click Configure Link to view or edit.
                        </p>
                      )}
                    </div>
                  )}

                  {isOffline && cls.classroomDetails && (
                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{cls.classroomDetails.branch || 'Campus Center'}</span>
                        <span>•</span>
                        <span>{cls.classroomDetails.roomNumber}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] pl-5">
                        {cls.classroomDetails.venueAddress}
                      </div>
                    </div>
                  )}

                  {/* Batch & Visibility */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-[var(--text-muted)]">Linked Batch:</span>
                      <span className="font-bold text-[var(--brand-text)]">
                        {cls.batch?.name ? `${cls.batch.name} (${cls.batch.batchCode})` : 'Independent Class'}
                      </span>
                    </div>

                    <div className="text-right text-[10px] font-mono text-[var(--text-muted)]">
                      {cls.showOnWebsite ? '🌐 Visible on Website' : '🔒 Internal Class'}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between gap-2">
                  <Button
                    variant="primary"
                    onClick={() => setRosterClass(cls)}
                    className="btn-primary text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5 shadow-md shadow-[#BE1E2E]/10"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Students ({enrolledCount}/{capacity})</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingClass(cls);
                        setIsCreateOpen(true);
                      }}
                      className="p-2 rounded-xl border border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--brand-background)] transition-colors"
                      title="Edit Class"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete class "${cls.name}"?`)) {
                          deleteMutation.mutate(cls.id);
                        }
                      }}
                      className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete Class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreateOpen && (
        <CreateClassModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingClass(null);
          }}
          initialData={editingClass}
        />
      )}

      {/* Student Roster Drawer */}
      {rosterClass && (
        <ClassRosterDrawer
          isOpen={!!rosterClass}
          onClose={() => setRosterClass(null)}
          classData={rosterClass}
        />
      )}
    </div>
  );
}
