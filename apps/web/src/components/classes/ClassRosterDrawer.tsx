'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Video,
  Building2,
  Calendar,
  Clock,
  Search,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '@edtech/ui';

interface ClassRosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classData: any;
}

export function ClassRosterDrawer({
  isOpen,
  onClose,
  classData
}: ClassRosterDrawerProps) {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch full class details including populated enrolled students
  const { data: currentClass, isLoading } = useQuery({
    queryKey: ['admin-class-details', classData?.id],
    queryFn: async () => {
      if (!classData?.id) return null;
      const res = await fetch(`/api/v1/classes/${classData.id}`);
      if (!res.ok) throw new Error('Failed to load class roster');
      const json = await res.json();
      return json.data;
    },
    enabled: !!classData?.id
  });

  // Fetch registered student users to enroll
  const { data: usersData } = useQuery({
    queryKey: ['admin-all-students-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users?limit=100');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: isOpen
  });

  const c = currentClass || classData;
  const capacity = c?.capacity || 25;
  const enrolledCount = c?.enrolledCount || 0;
  const seatsLeft = Math.max(0, capacity - enrolledCount);
  const isFull = enrolledCount >= capacity;
  const occupancyPercent = Math.min(100, Math.round((enrolledCount / capacity) * 100));

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/v1/classes/${c.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to enroll student');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-class-details', c.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setSelectedStudentId('');
      setSuccessMsg('Student successfully enrolled in this class.');
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Enrollment failed');
    }
  });

  // Unenroll Mutation
  const unenrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/v1/classes/${c.id}/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to remove student');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-class-details', c.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setSuccessMsg('Student removed from class. Seat freed up.');
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Unenrollment failed');
    }
  });

  if (!isOpen || !classData) return null;

  const enrolledStudents = c?.enrolledStudents || [];
  const filteredStudents = enrolledStudents.filter((s: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.studentName?.toLowerCase().includes(q) || s.studentEmail?.toLowerCase().includes(q);
  });

  // Filter out students who are already enrolled
  const enrolledStudentIds = new Set(enrolledStudents.map((s: any) => s.studentId));
  const availableStudentsToEnroll = (usersData || []).filter(
    (u: any) => !enrolledStudentIds.has(u.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bg-surface)] border-l border-[var(--brand-border)] h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  c.mode === 'ONLINE'
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                {c.mode === 'ONLINE' ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                {c.mode === 'ONLINE' ? 'Live Online (Zoom)' : 'Classroom (Campus)'}
              </span>
              <span className="font-mono text-xs font-bold text-[#BE1E2E]">{c.classCode}</span>
            </div>
            <h2 className="text-lg font-black text-[var(--brand-text)]">{c.name}</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Class Roster & Strict Seat Capacity Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seat Capacity Progress Gauge */}
        <div className="p-6 border-b border-[var(--brand-border)] bg-[var(--brand-background)]/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#BE1E2E]" />
              <span className="text-xs font-bold text-[var(--brand-text)]">
                Seat Capacity Utilization
              </span>
            </div>
            <span
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isFull
                  ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                  : seatsLeft <= 5
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
              }`}
            >
              {isFull ? 'CLASS FULL (0 Seats Left)' : `${seatsLeft} Seats Available`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFull
                    ? 'bg-red-500'
                    : seatsLeft <= 5
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-[#BE1E2E]'
                }`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>{enrolledCount} Students Enrolled</span>
              <span>Total Cap: {capacity} Seats ({occupancyPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Enroll Student Form with Hard Cap lock */}
        <div className="p-6 border-b border-[var(--brand-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#BE1E2E]" />
              <span>Enroll Student in this Class</span>
            </h3>
            {isFull && (
              <span className="text-[10px] font-mono font-bold text-red-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked (Capacity Reached)
              </span>
            )}
          </div>

          {isFull ? (
            <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs text-red-600 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                This class is at maximum seat capacity ({capacity} / {capacity})
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                To enroll more students, either edit the class to increase the seat capacity or unenroll an existing student.
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
              >
                <option value="">-- Select Student to Enroll --</option>
                {availableStudentsToEnroll.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                disabled={!selectedStudentId || enrollMutation.isPending}
                onClick={() => enrollMutation.mutate(selectedStudentId)}
                className="btn-primary text-xs px-4 py-2 shrink-0"
              >
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
              </Button>
            </div>
          )}
        </div>

        {/* Enrolled Students Roster List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--brand-text)]">
              Enrolled Students Roster ({enrolledStudents.length})
            </h3>
            {enrolledStudents.length > 5 && (
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-[var(--brand-background)] border border-[var(--brand-border)]"
                />
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
              Loading roster...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl space-y-2 text-xs text-[var(--text-muted)]">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="font-bold text-[var(--brand-text)]">No students enrolled yet</p>
              <p>Use the selector above to enroll students into this class cohort.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student: any) => (
                <div
                  key={student.studentId}
                  className="p-3.5 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-center justify-between gap-3 hover:border-slate-400 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 flex items-center justify-center font-bold text-[#BE1E2E] text-xs shrink-0">
                      {student.studentName ? student.studentName.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[var(--brand-text)] truncate">
                        {student.studentName || 'Student'}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {student.studentEmail || 'Registered Student'}
                      </div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">
                        Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${student.studentName || 'student'} from this class? This will free up 1 seat.`)) {
                        unenrollMutation.mutate(student.studentId);
                      }
                    }}
                    disabled={unenrollMutation.isPending}
                    title="Remove from class (free up seat)"
                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] flex justify-end">
          <Button variant="outline" onClick={onClose} className="text-xs px-5 py-2">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
