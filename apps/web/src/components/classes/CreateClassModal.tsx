'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Video,
  Building2,
  Users,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { Button } from '@edtech/ui';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialData?: any;
}

export function CreateClassModal({
  isOpen,
  onClose,
  onCreated,
  initialData
}: CreateClassModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [classCode, setClassCode] = useState(initialData?.classCode || '');
  const [mode, setMode] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>(initialData?.mode || 'ONLINE');
  const [capacity, setCapacity] = useState<number>(initialData?.capacity || 25);
  const [courseId, setCourseId] = useState(initialData?.courseId || '');
  const [batchId, setBatchId] = useState(initialData?.batchId || '');
  const [status, setStatus] = useState(initialData?.status || 'SCHEDULED');
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ''
  );
  const [startTime, setStartTime] = useState(initialData?.timing?.startTime || '10:00 AM');
  const [endTime, setEndTime] = useState(initialData?.timing?.endTime || '12:00 PM');
  const [timezone, setTimezone] = useState(initialData?.timing?.timezone || 'Asia/Kolkata');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    initialData?.daysOfWeek || ['Monday', 'Wednesday', 'Friday']
  );
  const [showOnWebsite, setShowOnWebsite] = useState(
    initialData?.showOnWebsite !== undefined ? initialData.showOnWebsite : true
  );

  // Zoom Details
  const [zoomUrl, setZoomUrl] = useState(initialData?.zoomDetails?.meetingUrl || '');
  const [zoomId, setZoomId] = useState(initialData?.zoomDetails?.meetingId || '');
  const [zoomPasscode, setZoomPasscode] = useState(initialData?.zoomDetails?.passcode || '');
  const [zoomHostUrl, setZoomHostUrl] = useState(initialData?.zoomDetails?.hostUrl || '');
  const [zoomInstructions, setZoomInstructions] = useState(initialData?.zoomDetails?.instructions || '');
  const [zoomAutoRecord, setZoomAutoRecord] = useState(initialData?.zoomDetails?.autoRecord || false);

  // Offline Classroom Details
  const [branch, setBranch] = useState(initialData?.classroomDetails?.branch || 'Noida Center');
  const [roomNumber, setRoomNumber] = useState(initialData?.classroomDetails?.roomNumber || 'Lab 1 - Mac Lab');
  const [floor, setFloor] = useState(initialData?.classroomDetails?.floor || '2nd Floor');
  const [venueAddress, setVenueAddress] = useState(
    initialData?.classroomDetails?.venueAddress || 'Plot E-54, Sector 6, Noida, Uttar Pradesh 201301'
  );
  const [centerContact, setCenterContact] = useState(
    initialData?.classroomDetails?.centerContact || '+91 98118 88235'
  );

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch available courses for dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['admin-courses-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/courses?limit=50');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    }
  });

  // Fetch available batches for dropdown
  const { data: batchesData } = useQuery({
    queryKey: ['admin-batches-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/batches?limit=50');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    }
  });

  const dayOptions = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const applyPreset = (preset: 'MWF' | 'TTS' | 'WEEKEND' | 'ALL_WEEK') => {
    if (preset === 'MWF') setSelectedDays(['Monday', 'Wednesday', 'Friday']);
    if (preset === 'TTS') setSelectedDays(['Tuesday', 'Thursday', 'Saturday']);
    if (preset === 'WEEKEND') setSelectedDays(['Saturday', 'Sunday']);
    if (preset === 'ALL_WEEK') setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Class name is required');
      if (!capacity || capacity < 1) throw new Error('Capacity must be at least 1 seat');
      if (!startDate) throw new Error('Start date is required');
      if (selectedDays.length === 0) throw new Error('Select at least one day for class schedule');

      if ((mode === 'ONLINE' || mode === 'HYBRID') && !zoomUrl.trim()) {
        throw new Error('Zoom meeting URL is required for online classes');
      }

      if ((mode === 'OFFLINE' || mode === 'HYBRID') && (!branch.trim() || !roomNumber.trim() || !venueAddress.trim())) {
        throw new Error('Campus branch, room/lab number, and venue address are required for offline classes');
      }

      const payload: any = {
        name: name.trim(),
        classCode: classCode.trim() || undefined,
        courseId: courseId || undefined,
        batchId: batchId || undefined,
        mode,
        capacity: Number(capacity),
        status,
        startDate,
        endDate: endDate || undefined,
        timing: {
          startTime,
          endTime,
          timezone
        },
        daysOfWeek: selectedDays,
        showOnWebsite,
        notes: notes.trim() || undefined
      };

      if (mode === 'ONLINE' || mode === 'HYBRID') {
        payload.zoomDetails = {
          meetingUrl: zoomUrl.trim(),
          meetingId: zoomId.trim() || undefined,
          passcode: zoomPasscode.trim() || undefined,
          hostUrl: zoomHostUrl.trim() || undefined,
          instructions: zoomInstructions.trim() || undefined,
          autoRecord: zoomAutoRecord
        };
      }

      if (mode === 'OFFLINE' || mode === 'HYBRID') {
        payload.classroomDetails = {
          branch: branch.trim(),
          roomNumber: roomNumber.trim(),
          floor: floor.trim() || undefined,
          venueAddress: venueAddress.trim(),
          centerContact: centerContact.trim() || undefined
        };
      }

      const url = isEditing ? `/api/v1/classes/${initialData.id}` : '/api/v1/classes';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to save class');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      onCreated?.();
      onClose();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save class');
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 flex items-center justify-center text-[#BE1E2E]">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--brand-text)]">
                {isEditing ? 'Edit Class Configuration' : 'Create New Class'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Define seats capacity, Zoom meeting room, or physical campus classroom venue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            saveMutation.mutate();
          }}
          className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
        >
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Class Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-2">
              <span>Training Mode</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('ONLINE')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  mode === 'ONLINE'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    : 'border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--text-muted)] hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Video className="w-5 h-5" />
                  {mode === 'ONLINE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <div className="font-black text-xs">Live Online (Zoom)</div>
                  <div className="text-[10px] opacity-80">Interactive live virtual class with meeting ID & passcode</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('OFFLINE')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  mode === 'OFFLINE'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--text-muted)] hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Building2 className="w-5 h-5" />
                  {mode === 'OFFLINE' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <div className="font-black text-xs">Classroom Training</div>
                  <div className="text-[10px] opacity-80">Campus center, physical lab, and allocated room number</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('HYBRID')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  mode === 'HYBRID'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20'
                    : 'border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--text-muted)] hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Laptop className="w-5 h-5" />
                  {mode === 'HYBRID' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <div>
                  <div className="font-black text-xs">Hybrid Training</div>
                  <div className="text-[10px] opacity-80">Simultaneous Zoom stream & physical in-class seats</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Basic Details: Name, Code, and Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[var(--brand-text)]">
                Class Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lab 101 - Practical Digital Marketing"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--brand-text)]">
                Class Code (Optional)
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="Auto e.g. CLS-ONL-001"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
              />
            </div>
          </div>

          {/* 3. STRICT SEAT CAPACITY LIMIT (User requirement) */}
          <div className="p-4 rounded-2xl bg-[#BE1E2E]/5 border border-[#BE1E2E]/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs text-[#BE1E2E]">
                <Users className="w-4 h-4" />
                <span>Seat Capacity (Strict Enrollment Limit)</span>
                <span className="text-red-500">*</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold">
                Hard Enrollment Cap
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-36">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={capacity}
                  onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl text-sm font-mono font-bold bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
                  required
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] flex-1">
                Only <strong className="text-[var(--brand-text)]">{capacity} students</strong> can enroll in this class. Once all seats are booked, further registrations are locked automatically with a <strong>&quot;SEATS FULL&quot;</strong> notice.
              </p>
            </div>
          </div>

          {/* 4. Mode Specific Configuration */}
          {(mode === 'ONLINE' || mode === 'HYBRID') && (
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-600 dark:text-blue-400">
                  <Video className="w-4 h-4" />
                  <span>Zoom Meeting Room Integration</span>
                </div>
                <span className="text-[10px] font-mono text-blue-500">Live Interactive Class</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">
                    Zoom Meeting URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={zoomUrl}
                    onChange={(e) => setZoomUrl(e.target.value)}
                    placeholder="https://zoom.us/j/1234567890?pwd=..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={mode === 'ONLINE'}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Meeting ID (Optional)</label>
                  <input
                    type="text"
                    value={zoomId}
                    onChange={(e) => setZoomId(e.target.value)}
                    placeholder="e.g. 842 9912 0031"
                    className="w-full px-3 py-2 rounded-xl font-mono bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Passcode (Optional)</label>
                  <input
                    type="text"
                    value={zoomPasscode}
                    onChange={(e) => setZoomPasscode(e.target.value)}
                    placeholder="e.g. DIDM2024"
                    className="w-full px-3 py-2 rounded-xl font-mono bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Host / Start URL (Optional for Trainer)</label>
                  <input
                    type="text"
                    value={zoomHostUrl}
                    onChange={(e) => setZoomHostUrl(e.target.value)}
                    placeholder="e.g. Host start link for trainer"
                    className="w-full px-3 py-2 rounded-xl font-mono text-[11px] bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Student Joining Instructions</label>
                  <input
                    type="text"
                    value={zoomInstructions}
                    onChange={(e) => setZoomInstructions(e.target.value)}
                    placeholder="e.g. Please join 10 minutes prior with stable broadband and webcam enabled."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {(mode === 'OFFLINE' || mode === 'HYBRID') && (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  <Building2 className="w-4 h-4" />
                  <span>Physical Classroom & Campus Venue</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-500">In-Person Training</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">
                    Campus Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Noida Center">Noida Center (Sec 18)</option>
                    <option value="South Delhi">South Delhi (Kalkaji)</option>
                    <option value="Gurugram">Gurugram (Cyber City)</option>
                    <option value="West Delhi">West Delhi (Janakpuri)</option>
                    <option value="North Delhi">North Delhi (Pitampura)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">
                    Room / Lab Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Lab 2 - iMac Lab"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required={mode === 'OFFLINE'}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Floor / Wing</label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. 2nd Floor, Wing B"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">
                    Full Venue Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="e.g. Building E-54, Sector 6, Noida, UP"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required={mode === 'OFFLINE'}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Center Helpdesk</label>
                  <input
                    type="text"
                    value={centerContact}
                    onChange={(e) => setCenterContact(e.target.value)}
                    placeholder="+91 98118 88235"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Course & Batch Association */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--brand-text)]">Linked Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
              >
                <option value="">-- No Specific Course --</option>
                {(coursesData || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[var(--brand-text)]">Linked Batch (Optional)</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
              >
                <option value="">-- Independent Class --</option>
                {(batchesData || []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.batchCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6. Schedule & Timings */}
          <div className="space-y-3 pt-2 border-t border-[var(--brand-border)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--brand-text)]">
                Class Schedule Days & Presets <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => applyPreset('MWF')}
                  className="px-2 py-0.5 rounded bg-[var(--brand-background)] hover:bg-[#BE1E2E]/10 border border-[var(--brand-border)] text-[var(--brand-text)]"
                >
                  Mon-Wed-Fri
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('TTS')}
                  className="px-2 py-0.5 rounded bg-[var(--brand-background)] hover:bg-[#BE1E2E]/10 border border-[var(--brand-border)] text-[var(--brand-text)]"
                >
                  Tue-Thu-Sat
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('WEEKEND')}
                  className="px-2 py-0.5 rounded bg-[var(--brand-background)] hover:bg-[#BE1E2E]/10 border border-[var(--brand-border)] text-[var(--brand-text)]"
                >
                  Weekend
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('ALL_WEEK')}
                  className="px-2 py-0.5 rounded bg-[var(--brand-background)] hover:bg-[#BE1E2E]/10 border border-[var(--brand-border)] text-[var(--brand-text)]"
                >
                  Mon-Fri
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-[#BE1E2E] text-white border-[#BE1E2E] shadow-sm'
                        : 'bg-[var(--brand-background)] text-[var(--text-muted)] border-[var(--brand-border)] hover:border-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Start Time *</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full px-3 py-2 rounded-xl font-mono bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">End Time *</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="12:00 PM"
                  className="w-full px-3 py-2 rounded-xl font-mono bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* 7. Website Visibility Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs">
            <div>
              <div className="font-bold text-[var(--brand-text)]">Publish on Public Website</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Allow prospective students to see this class and view seat availability.
              </div>
            </div>
            <input
              type="checkbox"
              checked={showOnWebsite}
              onChange={(e) => setShowOnWebsite(e.target.checked)}
              className="w-4 h-4 accent-[#BE1E2E] rounded cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--brand-border)]">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs px-4 py-2">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saveMutation.isPending}
              className="btn-primary text-xs px-6 py-2 shadow-md shadow-[#BE1E2E]/20"
            >
              {saveMutation.isPending ? 'Saving Class...' : isEditing ? 'Update Class' : 'Create Class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
