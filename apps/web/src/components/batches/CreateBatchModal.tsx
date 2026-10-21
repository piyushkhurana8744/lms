'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import {
  Video,
  Building2,
  Calendar,
  Clock,
  Users,
  MapPin,
  Globe,
  Sparkles,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Plus,
  BookOpen,
  User,
  Layers,
  Lock,
  ExternalLink
} from 'lucide-react';
import {
  IBatch,
  BatchMode,
  BatchStatus,
  CreateBatchPayload,
  UpdateBatchPayload
} from '@edtech/types';

export interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateBatchPayload) => Promise<void>;
  initialData?: IBatch | null;
  isSubmitting: boolean;
}

const BRANCH_PRESETS = [
  { name: 'Noida Center (Sector 62)', address: 'A-12, Sector 62, Noida, UP - 201301', phone: '+91 8800505151' },
  { name: 'Delhi HQ (Pitampura)', address: 'Plot 14, Netaji Subhash Place, Pitampura, New Delhi - 110034', phone: '+91 8800505152' },
  { name: 'South Delhi (Kalu Sarai)', address: 'Building 4B, Kalu Sarai, Near Hauz Khas Metro, New Delhi - 110016', phone: '+91 8800505153' },
  { name: 'Gurugram Center', address: 'Cyber City Hub, Sector 24, Gurugram, Haryana - 122002', phone: '+91 8800505154' },
  { name: 'Jaipur Center', address: 'Gopalpura Bypass, Tonk Road, Jaipur, Rajasthan - 302018', phone: '+91 8800505155' }
];

const DAYS = [
  { key: 'MONDAY', label: 'Mon' },
  { key: 'TUESDAY', label: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' },
  { key: 'FRIDAY', label: 'Fri' },
  { key: 'SATURDAY', label: 'Sat' },
  { key: 'SUNDAY', label: 'Sun' }
];

type BranchOption = { _id: string; id?: string; name: string; code?: string; status?: string };

export function CreateBatchModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting
}: CreateBatchModalProps) {
  const [mode, setMode] = useState<BatchMode>('ONLINE');
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [status, setStatus] = useState<BatchStatus>('UPCOMING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('01:00 PM');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [selectedDays, setSelectedDays] = useState<string[]>(['SATURDAY', 'SUNDAY']);
  const [maxSeats, setMaxSeats] = useState(30);
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [notes, setNotes] = useState('');

  // Zoom Details
  const [zoomMeetingUrl, setZoomMeetingUrl] = useState('');
  const [zoomMeetingId, setZoomMeetingId] = useState('');
  const [zoomPasscode, setZoomPasscode] = useState('');
  const [zoomInstructions, setZoomInstructions] = useState('Join 5 mins prior to class with microphone enabled');
  const [isAutoZoom, setIsAutoZoom] = useState(true);

  // Classroom Details
  const [classroomBranch, setClassroomBranch] = useState(BRANCH_PRESETS[0].name);
  const [classroomRoom, setClassroomRoom] = useState('Lab 1 - Digital Lab');
  const [classroomAddress, setClassroomAddress] = useState(BRANCH_PRESETS[0].address);
  const [classroomPhone, setClassroomPhone] = useState(BRANCH_PRESETS[0].phone);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available courses for dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['admin-courses-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/courses?limit=50');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: isOpen
  });

  // Fetch team instructors for dropdown
  const { data: teamData } = useQuery({
    queryKey: ['admin-team-instructors'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/members?limit=50');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: isOpen
  });

  const { data: branchesData } = useQuery({
    queryKey: ['admin-branches-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/branches?limit=100&status=ACTIVE');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.items || json.data || [];
    },
    enabled: isOpen
  });

  const branches = (branchesData || []) as BranchOption[];

  useEffect(() => {
    if (initialData) {
      setMode(initialData.mode || 'ONLINE');
      setName(initialData.name || '');
      setBatchCode(initialData.batchCode || '');
      setBranchId(initialData.branchId || '');
      setCourseId(initialData.courseId || '');
      setInstructorId(initialData.instructorId || '');
      setStatus(initialData.status || 'UPCOMING');
      setStartDate(
        initialData.startDate
          ? new Date(initialData.startDate).toISOString().split('T')[0]
          : ''
      );
      setEndDate(
        initialData.endDate
          ? new Date(initialData.endDate).toISOString().split('T')[0]
          : ''
      );
      setStartTime(initialData.timing?.startTime || '10:00 AM');
      setEndTime(initialData.timing?.endTime || '01:00 PM');
      setTimezone(initialData.timing?.timezone || 'Asia/Kolkata');
      setSelectedDays(initialData.daysOfWeek || ['SATURDAY', 'SUNDAY']);
      setMaxSeats(initialData.maxSeats || 30);
      setShowOnWebsite(initialData.showOnWebsite ?? true);
      setNotes(initialData.notes || '');

      if (initialData.zoomDetails) {
        setZoomMeetingUrl(initialData.zoomDetails.meetingUrl || '');
        setZoomMeetingId(initialData.zoomDetails.meetingId || '');
        setZoomPasscode(initialData.zoomDetails.passcode || '');
        setZoomInstructions(initialData.zoomDetails.instructions || '');
        setIsAutoZoom(!initialData.zoomDetails.meetingUrl);
      } else {
        setIsAutoZoom(true);
      }

      if (initialData.classroomDetails) {
        setClassroomBranch(initialData.classroomDetails.branch || BRANCH_PRESETS[0].name);
        setClassroomRoom(initialData.classroomDetails.roomNumber || 'Lab 1');
        setClassroomAddress(initialData.classroomDetails.venueAddress || '');
        setClassroomPhone(initialData.classroomDetails.contactPhone || '');
      }
    } else {
      // Defaults for new batch
      setMode('ONLINE');
      setName('');
      setBatchCode('');
      setBranchId('');
      setCourseId('');
      setInstructorId('');
      setStatus('UPCOMING');
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setStartDate(nextWeek.toISOString().split('T')[0]);
      setEndDate('');
      setStartTime('10:00 AM');
      setEndTime('01:00 PM');
      setTimezone('Asia/Kolkata');
      setSelectedDays(['SATURDAY', 'SUNDAY']);
      setMaxSeats(30);
      setShowOnWebsite(true);
      setNotes('');
      setZoomMeetingUrl('');
      setZoomMeetingId('');
      setZoomPasscode('DIDM2026');
      setZoomInstructions('Join 5 mins prior to class with microphone enabled');
      setClassroomBranch(BRANCH_PRESETS[0].name);
      setClassroomRoom('Lab 1 - Digital Lab');
      setClassroomAddress(BRANCH_PRESETS[0].address);
      setClassroomPhone(BRANCH_PRESETS[0].phone);
      setErrorMsg(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleBranchSelect = (branchName: string) => {
    setClassroomBranch(branchName);
    const preset = BRANCH_PRESETS.find((b) => b.name === branchName);
    if (preset) {
      setClassroomAddress(preset.address);
      setClassroomPhone(preset.phone);
    }
  };

  const toggleDay = (dayKey: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const selectPresetDays = (preset: 'WEEKEND' | 'WEEKDAY') => {
    if (preset === 'WEEKEND') {
      setSelectedDays(['SATURDAY', 'SUNDAY']);
    } else {
      setSelectedDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a batch name.');
      return;
    }
    if (!startDate) {
      setErrorMsg('Please select a start date.');
      return;
    }
    if (!branchId) {
      setErrorMsg('Please select an operational branch for this batch.');
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMsg('Please select at least one day for the batch schedule.');
      return;
    }

    if ((mode === 'ONLINE' || mode === 'HYBRID') && !isAutoZoom && !zoomMeetingUrl.trim() && !zoomMeetingId.trim()) {
      setErrorMsg('For online batches with manual entry, please provide a Zoom Meeting Link or Meeting ID.');
      return;
    }

    if ((mode === 'OFFLINE' || mode === 'HYBRID') && !classroomAddress.trim()) {
      setErrorMsg('For offline classroom batches, please provide the campus address.');
      return;
    }

    setErrorMsg(null);

    const payload: CreateBatchPayload = {
      name: name.trim(),
      branchId,
      batchCode: batchCode.trim() || undefined,
      courseId: courseId || undefined,
      instructorId: instructorId || undefined,
      mode,
      status,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      timing: {
        startTime,
        endTime,
        timezone
      },
      daysOfWeek: selectedDays,
      maxSeats: Number(maxSeats) || 30,
      showOnWebsite,
      notes: notes.trim() || undefined,
      zoomDetails:
        mode === 'ONLINE' || mode === 'HYBRID'
          ? isAutoZoom
            ? {
                meetingUrl: undefined,
                instructions: zoomInstructions.trim() || undefined
              }
            : {
                meetingUrl: zoomMeetingUrl.trim() || undefined,
                meetingId: zoomMeetingId.trim() || undefined,
                passcode: zoomPasscode.trim() || undefined,
                instructions: zoomInstructions.trim() || undefined
              }
          : undefined,
      classroomDetails:
        mode === 'OFFLINE' || mode === 'HYBRID'
          ? {
              branch: classroomBranch,
              roomNumber: classroomRoom.trim() || undefined,
              venueAddress: classroomAddress.trim() || undefined,
              contactPhone: classroomPhone.trim() || undefined
            }
          : undefined
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save batch');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-2xl w-full my-6 shadow-2xl text-[var(--brand-text)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--bg-surface-elevated)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 flex items-center justify-center text-[#BE1E2E]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-[var(--brand-text)]">
                {initialData ? 'Edit Class Batch' : 'Create New Class Batch'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Setup Online (Zoom) or Classroom (Campus) batch schedules for students
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--brand-background)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Training Delivery Mode Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 font-mono uppercase tracking-wider">
              Training Delivery Mode <span className="text-[#BE1E2E]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('ONLINE')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center sm:items-start gap-1.5 ${
                  mode === 'ONLINE'
                    ? 'border-[#BE1E2E] bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold shadow-sm'
                    : 'border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span className="text-xs">Online (Zoom)</span>
                </div>
                <span className="text-[10px] opacity-75 hidden sm:inline">
                  Live interactive online classes with Zoom links
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('OFFLINE')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center sm:items-start gap-1.5 ${
                  mode === 'OFFLINE'
                    ? 'border-[#BE1E2E] bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold shadow-sm'
                    : 'border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs">Classroom (Offline)</span>
                </div>
                <span className="text-[10px] opacity-75 hidden sm:inline">
                  In-person physical lab training at campus centers
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('HYBRID')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center sm:items-start gap-1.5 ${
                  mode === 'HYBRID'
                    ? 'border-[#BE1E2E] bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold shadow-sm'
                    : 'border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <span className="text-xs">Hybrid Mode</span>
                </div>
                <span className="text-[10px] opacity-75 hidden sm:inline">
                  Dual mode: Campus attendees + Zoom live stream
                </span>
              </button>
            </div>
          </div>

          {/* Core Batch Details */}
          <div className="space-y-3.5 pt-2 border-t border-[var(--brand-border)]">
            <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1">
              <Calendar className="w-4 h-4 text-[#BE1E2E]" /> Basic Batch Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Batch Title / Name <span className="text-[#BE1E2E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Digital Marketing Weekend Batch - Oct 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Batch Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated e.g. DIDM-ONL-001"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono uppercase focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BatchStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                >
                  <option value="UPCOMING">Upcoming (Enrollment Open)</option>
                  <option value="ONGOING">Ongoing (In Session)</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Operational Branch <span className="text-[#BE1E2E]">*</span>
                </label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map((branch) => {
                    const id = branch._id || branch.id || '';
                    return (
                      <option key={id} value={id}>
                        {branch.name}{branch.code ? ` (${branch.code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Select Associated Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                >
                  <option value="">-- General / No Specific Course --</option>
                  {(coursesData || []).map((c: any) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Assigned Trainer / Instructor
                </label>
                <select
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                >
                  <option value="">-- Select Trainer --</option>
                  {(teamData || []).map((m: any) => (
                    <option key={m.userId || m.id} value={m.userId || m.id}>
                      {m.user?.name || m.user?.email || 'Trainer'} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Timing */}
          <div className="space-y-3.5 pt-2 border-t border-[var(--brand-border)]">
            <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1">
              <Clock className="w-4 h-4 text-[#BE1E2E]" /> Schedule & Timing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Start Date <span className="text-[#BE1E2E]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Class Start Time
                </label>
                <input
                  type="text"
                  placeholder="10:00 AM"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Class End Time
                </label>
                <input
                  type="text"
                  placeholder="01:00 PM"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-muted)]">
                    Days of Week
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => selectPresetDays('WEEKEND')}
                      className="px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[#BE1E2E] font-bold"
                    >
                      Weekend Preset (Sat-Sun)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPresetDays('WEEKDAY')}
                      className="px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[#BE1E2E] font-bold"
                    >
                      Weekday Preset (Mon-Fri)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const isSelected = selectedDays.includes(day.key);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDay(day.key)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#BE1E2E] border-[#BE1E2E] text-white shadow-sm'
                            : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Maximum Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxSeats}
                  onChange={(e) => setMaxSeats(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="showOnWebsiteCheckbox"
                  checked={showOnWebsite}
                  onChange={(e) => setShowOnWebsite(e.target.checked)}
                  className="w-4 h-4 rounded text-[#BE1E2E] accent-[#BE1E2E] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="showOnWebsiteCheckbox" className="font-bold text-xs cursor-pointer select-none">
                  Display batch schedule on Public Website
                </label>
              </div>
            </div>
          </div>

          {/* Conditional: ZOOM Integration for Online / Hybrid */}
          {(mode === 'ONLINE' || mode === 'HYBRID') && (
            <div className="space-y-3.5 pt-3 border-t border-[var(--brand-border)] bg-blue-500/5 p-4 rounded-2xl border border-blue-500/20">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-blue-500/20 pb-2">
                <div className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                  <Video className="w-4 h-4" /> Zoom Meeting Room Configuration
                </div>
                <div className="flex items-center gap-1 bg-[var(--brand-background)] p-1 rounded-xl border border-[var(--brand-border)] text-xs">
                  <button
                    type="button"
                    onClick={() => setIsAutoZoom(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all text-xs ${
                      isAutoZoom
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Create (Zoom)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutoZoom(false)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all text-xs ${
                      !isAutoZoom
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                    }`}
                  >
                    <span>Manual Entry</span>
                  </button>
                </div>
              </div>

              {isAutoZoom ? (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                  <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Auto-Fill Zoom Meeting Mode Active</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Meeting URL, Meeting ID aur Passcode aapke connected Zoom account se automatically generate honge. Save karte hi details auto-fill ho jayengi!
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                  <span>Custom URL Mode: Agar aap kisi aur platform (Google Meet/Teams) ya already created Zoom link daalna chahte hain, toh yahan manually type karein.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[var(--text-muted)]">
                      Zoom Meeting Join URL
                    </label>
                    {isAutoZoom && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Auto-fill on Save
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={isAutoZoom}
                    placeholder={isAutoZoom ? '⚡ Auto-generated via Connected Zoom upon saving' : 'https://zoom.us/j/...'}
                    value={isAutoZoom ? '⚡ Auto-generated via Connected Zoom upon saving' : zoomMeetingUrl}
                    onChange={(e) => setZoomMeetingUrl(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 font-mono transition-colors ${
                      isAutoZoom
                        ? 'bg-[var(--brand-border)]/20 border-blue-500/30 text-blue-600 dark:text-blue-300 font-medium cursor-not-allowed opacity-90 select-none'
                        : 'bg-[var(--brand-background)] border-[var(--brand-border)]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[var(--text-muted)]">
                      Zoom Meeting ID
                    </label>
                    {isAutoZoom && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">Auto</span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={isAutoZoom}
                    placeholder={isAutoZoom ? '⚡ Auto-generated' : '812 3456 7890'}
                    value={isAutoZoom ? '⚡ Auto-generated' : zoomMeetingId}
                    onChange={(e) => setZoomMeetingId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 font-mono transition-colors ${
                      isAutoZoom
                        ? 'bg-[var(--brand-border)]/20 border-blue-500/30 text-blue-600 dark:text-blue-300 font-medium cursor-not-allowed opacity-90 select-none'
                        : 'bg-[var(--brand-background)] border-[var(--brand-border)]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[var(--text-muted)]">
                      Meeting Passcode
                    </label>
                    {isAutoZoom && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">Auto</span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={isAutoZoom}
                    placeholder={isAutoZoom ? '⚡ Auto-generated' : 'e.g. DIDM2026'}
                    value={isAutoZoom ? '⚡ Auto-generated' : zoomPasscode}
                    onChange={(e) => setZoomPasscode(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 font-mono transition-colors ${
                      isAutoZoom
                        ? 'bg-[var(--brand-border)]/20 border-blue-500/30 text-blue-600 dark:text-blue-300 font-medium cursor-not-allowed opacity-90 select-none'
                        : 'bg-[var(--brand-background)] border-[var(--brand-border)]'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Instructions for Students
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please join with your registered name 5 mins prior"
                    value={zoomInstructions}
                    onChange={(e) => setZoomInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Classroom Training Details for Offline / Hybrid */}
          {(mode === 'OFFLINE' || mode === 'HYBRID') && (
            <div className="space-y-3.5 pt-3 border-t border-[var(--brand-border)] bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
              <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Classroom / Campus Training Venue
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Select Campus / Center Branch
                  </label>
                  <select
                    value={classroomBranch}
                    onChange={(e) => handleBranchSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {BRANCH_PRESETS.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Classroom / Lab Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 2 - Digital Strategy Lab"
                    value={classroomRoom}
                    onChange={(e) => setClassroomRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Venue Physical Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Full physical address of the institute center"
                    value={classroomAddress}
                    onChange={(e) => setClassroomAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Center Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 8800505151"
                    value={classroomPhone}
                    onChange={(e) => setClassroomPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Internal Notes / Curriculum Highlights
            </label>
            <textarea
              rows={2}
              placeholder="Any batch-specific syllabus notes, prerequisites, or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] flex items-center justify-end gap-2.5 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-xs btn-primary shadow-lg shadow-[#BE1E2E]/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Batch...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{initialData ? 'Update Batch' : 'Create Batch Schedule'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
