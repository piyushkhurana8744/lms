'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IBatch, BatchMode, BatchStatus, CreateBatchPayload } from '@edtech/types';
import { Button, Card, Badge } from '@edtech/ui';
import { CreateBatchModal } from '@/components/batches/CreateBatchModal';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import {
  Calendar,
  Video,
  Building2,
  Globe,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  ArrowLeft,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle,
  Loader2,
  Sparkles,
  BookOpen,
  MapPin
} from 'lucide-react';

export default function AdminBatchesDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<IBatch | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch batches
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-batches', search, modeFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (modeFilter !== 'ALL') params.append('mode', modeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '15');

      const res = await fetch(`/api/v1/batches?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch batches');
      }
      return res.json();
    }
  });

  const batches: IBatch[] = data?.data || [];
  const stats = data?.stats || {
    totalBatches: 0,
    onlineCount: 0,
    offlineCount: 0,
    upcomingCount: 0,
    ongoingCount: 0
  };
  const pagination = data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };

  // Mutations
  const createBatchMutation = useMutation({
    mutationFn: async (payload: CreateBatchPayload) => {
      const res = await fetch('/api/v1/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create batch');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      showToast('Batch scheduled successfully');
      setIsModalOpen(false);
    },
    onError: (err: Error) => {
      showError({ title: 'Creation Failed', message: err.message });
    }
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateBatchPayload }) => {
      const res = await fetch(`/api/v1/batches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update batch');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      showToast('Batch updated successfully');
      setIsModalOpen(false);
      setEditingBatch(null);
    },
    onError: (err: Error) => {
      showError({ title: 'Update Failed', message: err.message });
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/v1/batches/${batchId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete batch');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      showToast('Batch deleted successfully');
    },
    onError: (err: Error) => {
      showError({ title: 'Deletion Failed', message: err.message });
    }
  });

  const handleOpenCreate = () => {
    setEditingBatch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (batch: IBatch) => {
    setEditingBatch(batch);
    setIsModalOpen(true);
  };

  const handleDelete = async (batch: IBatch) => {
    await confirm({
      title: 'Delete Class Batch?',
      description: `Are you sure you want to delete batch "${batch.name}" (${batch.batchCode})? This action cannot be undone.`,
      confirmText: 'Delete Batch',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        await deleteBatchMutation.mutateAsync(batch.id);
      }
    });
  };

  const handleFormSubmit = async (payload: CreateBatchPayload) => {
    if (editingBatch) {
      await updateBatchMutation.mutateAsync({ id: editingBatch.id, payload });
    } else {
      await createBatchMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-500 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            <Calendar className="w-4 h-4" /> Academic Schedule
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Batches & Classes
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage Online Live Classes (with Zoom) and Offline Classroom batches across branches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 text-xs btn-primary shadow-lg shadow-[#BE1E2E]/20"
          >
            <Plus className="w-4 h-4" /> Schedule New Batch
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-[var(--text-muted)] font-mono font-bold">Total Batches</div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.totalBatches}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-blue-500 font-mono font-bold flex items-center gap-1">
            <Video className="w-3.5 h-3.5" /> Online (Zoom)
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.onlineCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-emerald-500 font-mono font-bold flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Classroom (Campus)
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.offlineCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-purple-500 font-mono font-bold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Upcoming
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.upcomingCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-amber-500 font-mono font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Ongoing
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.ongoingCount}</div>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by batch name, code, or branch..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="font-bold text-[var(--text-muted)] font-mono">Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="ALL">All Modes</option>
              <option value="ONLINE">Online (Zoom)</option>
              <option value="OFFLINE">Classroom (Campus)</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-muted)] font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batches Table List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
          <p>Loading Class Batches...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
          Failed to load batches: {(error as Error)?.message}
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl bg-[var(--bg-surface-elevated)] space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="font-extrabold text-sm text-[var(--brand-text)]">No batches scheduled yet</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Schedule an Online Live Zoom batch or an In-Person Classroom training batch to begin enrolling students.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="text-xs btn-primary">
              <Plus className="w-4 h-4" /> Create First Batch
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--brand-background)] border-b border-[var(--brand-border)] text-[var(--text-muted)] uppercase font-mono font-bold text-[11px]">
                <tr>
                  <th className="p-4">Batch Details</th>
                  <th className="p-4">Training Mode</th>
                  <th className="p-4">Schedule & Timings</th>
                  <th className="p-4">Trainer & Course</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Status & Web</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)] text-[var(--brand-text)]">
                {batches.map((batch) => {
                  const isOnline = batch.mode === 'ONLINE' || batch.mode === 'HYBRID';
                  const isOffline = batch.mode === 'OFFLINE' || batch.mode === 'HYBRID';

                  const modeBadge =
                    batch.mode === 'ONLINE'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      : batch.mode === 'OFFLINE'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-purple-500/10 text-purple-500 border-purple-500/30';

                  const statusBadge =
                    batch.status === 'UPCOMING'
                      ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                      : batch.status === 'ONGOING'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : batch.status === 'COMPLETED'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      : 'bg-red-500/10 text-red-500 border-red-500/30';

                  return (
                    <tr key={batch.id} className="hover:bg-[var(--brand-background)]/50 transition-colors">
                      {/* Name & Code */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-extrabold text-xs text-[var(--brand-text)] flex items-center gap-1.5">
                            {batch.name}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[var(--brand-background)] border border-[var(--brand-border)] font-mono text-[10px] font-bold text-[#BE1E2E]">
                              {batch.batchCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Training Mode */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase font-mono tracking-wider ${modeBadge}`}
                          >
                            {batch.mode === 'ONLINE' ? (
                              <Video className="w-3 h-3" />
                            ) : batch.mode === 'OFFLINE' ? (
                              <Building2 className="w-3 h-3" />
                            ) : (
                              <Globe className="w-3 h-3" />
                            )}
                            {batch.mode}
                          </span>

                          {isOffline && batch.classroomDetails?.branch && (
                            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#BE1E2E]" />
                              <span>{batch.classroomDetails.branch}</span>
                            </div>
                          )}

                          {isOnline && batch.zoomDetails?.meetingId && (
                            <div className="text-[10px] text-blue-500 font-mono">
                              Zoom ID: {batch.zoomDetails.meetingId}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Schedule & Timings */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-bold text-[var(--brand-text)] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            {batch.timing.startTime} - {batch.timing.endTime}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            Starts: {new Date(batch.startDate).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {batch.daysOfWeek.map((d) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.2 rounded bg-[var(--brand-background)] border border-[var(--brand-border)] text-[9px] font-mono font-bold"
                              >
                                {d.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Trainer & Course */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-bold text-xs flex items-center gap-1 text-[var(--brand-text)]">
                            <BookOpen className="w-3 h-3 text-[#BE1E2E]" />
                            <span className="truncate max-w-[180px]">
                              {batch.course?.title || 'General Course'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{batch.instructor?.name || 'Assigned Faculty'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="p-4 font-mono">
                        <div className="space-y-1">
                          <div className="text-xs font-bold">
                            {batch.enrolledCount} / {batch.maxSeats} seats
                          </div>
                          <div className="w-24 h-1.5 bg-[var(--brand-border)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#BE1E2E]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((batch.enrolledCount / batch.maxSeats) * 100)
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status & Website */}
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase font-mono tracking-wider ${statusBadge}`}
                          >
                            ● {batch.status}
                          </span>
                          {batch.showOnWebsite ? (
                            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Visible on Site
                            </div>
                          ) : (
                            <div className="text-[10px] text-[var(--text-muted)]">
                              Private / Internal
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isOnline && batch.zoomDetails?.meetingUrl && (
                            <a
                              href={batch.zoomDetails.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                              title="Start Zoom Meeting"
                            >
                              <Video className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(batch)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--brand-background)]"
                            title="Edit Batch"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(batch)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                            title="Delete Batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Batch Modal */}
      <CreateBatchModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBatch(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingBatch}
        isSubmitting={createBatchMutation.isPending || updateBatchMutation.isPending}
      />
    </div>
  );
}
