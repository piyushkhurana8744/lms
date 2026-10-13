'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import {
  GraduationCap,
  RefreshCw,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  ArrowRightLeft,
  Search,
  ExternalLink
} from 'lucide-react';
import {
  IExternalAcademicResourceDTO,
  IIntegrationSyncRunDTO,
  IIntegrationConnectionDTO
} from '@edtech/types';

export default function GoogleClassroomSyncPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<IExternalAcademicResourceDTO[]>([]);
  const [syncRuns, setSyncRuns] = useState<IIntegrationSyncRunDTO[]>([]);
  const [connections, setConnections] = useState<IIntegrationConnectionDTO[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [externalCourses, setExternalCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Link modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedExternalCourseId, setSelectedExternalCourseId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [linksRes, runsRes, connRes, batchRes] = await Promise.all([
        fetch('/api/v1/integrations/google-classroom/links'),
        fetch('/api/v1/integrations/sync-runs'),
        fetch('/api/v1/integrations/connections'),
        fetch('/api/v1/batches')
      ]);

      if (linksRes.ok) {
        const d = await linksRes.json();
        setLinks(d.data || []);
      }
      if (runsRes.ok) {
        const d = await runsRes.json();
        setSyncRuns(d.data?.items || []);
      }
      if (connRes.ok) {
        const d = await connRes.json();
        const gcConns = (d.data || []).filter((c: any) => c.provider === 'GOOGLE_CLASSROOM');
        setConnections(gcConns);
        if (gcConns.length > 0) {
          setSelectedConnectionId(gcConns[0].id);
        }
      }
      if (batchRes.ok) {
        const d = await batchRes.json();
        setBatches(d.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch classroom data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDiscover = async () => {
    if (!selectedConnectionId) return;
    try {
      const res = await fetch(`/api/v1/integrations/google-classroom/courses?connectionId=${selectedConnectionId}`);
      if (res.ok) {
        const d = await res.json();
        setExternalCourses(d.data?.courses || []);
      }
    } catch (err) {
      console.error('Failed to discover courses', err);
    }
  };

  const handleLink = async () => {
    if (!selectedBatchId || !selectedExternalCourseId || !selectedConnectionId) return;
    try {
      const res = await fetch('/api/v1/integrations/google-classroom/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          batchId: selectedBatchId,
          externalCourseId: selectedExternalCourseId,
          syncDirection: 'BIDIRECTIONAL',
          gradePolicy: 'DIDM_AUTHORITATIVE'
        })
      });

      if (res.ok) {
        setIsLinkModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Linking failed', err);
    }
  };

  const handleSync = async (linkId: string) => {
    try {
      setSyncingId(linkId);
      const res = await fetch(`/api/v1/integrations/google-classroom/links/${linkId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncRoster: true,
          syncCoursework: true,
          syncSubmissions: true,
          syncGrades: true
        })
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleResolveConflict = async (linkId: string) => {
    try {
      const res = await fetch(`/api/v1/integrations/google-classroom/links/${linkId}/resolve-conflict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conflictKey: 'grades',
          resolution: 'ACCEPT_DIDM'
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Resolve conflict failed', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-text)] flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-amber-500" />
            Google Classroom Synchronization
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Map DIDM batches to Google Classroom courses, sync rosters, assignments, and grades.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsLinkModalOpen(true);
              handleDiscover();
            }}
            disabled={!connections.some((connection) => connection.status === 'CONNECTED' || connection.status === 'DEMO')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#BE1E2E] text-white rounded-lg text-sm font-bold shadow hover:bg-[#a61725] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LinkIcon className="w-4 h-4" />
            Link Batch to Classroom
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-lg text-[var(--brand-text)] hover:bg-[var(--brand-border)]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div data-testid="classroom-connection-status" className={`rounded-xl border p-4 text-sm ${connections.some((connection) => connection.status === 'CONNECTED' || connection.status === 'DEMO') ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
        {connections.some((connection) => connection.status === 'CONNECTED' || connection.status === 'DEMO')
          ? `Google Classroom connected (${connections.find((connection) => connection.status === 'CONNECTED' || connection.status === 'DEMO')?.externalAccountId || 'institution account'}).`
          : 'Google Classroom is not connected. Connect it before linking or synchronizing batches.'}
        <Link href="/admin/settings/integrations" className="ml-2 font-bold underline">Open Integrations</Link>
      </div>

      {/* Linked Resources Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--brand-border)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#BE1E2E]" />
            Active Classroom Mappings ({links.length})
          </h2>
        </div>

        {links.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)]">
            No batches linked to Google Classroom yet. Click &quot;Link Batch to Classroom&quot; to start synchronization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--brand-text)]">
              <thead className="bg-[var(--bg-surface-elevated)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--brand-border)]">
                <tr>
                  <th className="px-4 py-3">DIDM Batch</th>
                  <th className="px-4 py-3">Classroom Course ID</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Synced</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-[var(--bg-surface-elevated)] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[var(--brand-text)]">
                      {link.metadata?.batchName || link.canonicalResourceId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {link.externalResourceId}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-mono text-[var(--text-muted)]">
                        <ArrowRightLeft className="w-3 h-3 text-[#BE1E2E]" />
                        {link.syncDirection}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {link.status === 'SYNCED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                        </span>
                      ) : link.status === 'CONFLICT' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Conflict
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">{link.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {link.lastSyncedAt ? new Date(link.lastSyncedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {link.status === 'CONFLICT' && (
                        <button
                          onClick={() => handleResolveConflict(link.id)}
                          className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20"
                        >
                          Resolve (Accept DIDM)
                        </button>
                      )}
                      <button
                        onClick={() => handleSync(link.id)}
                        disabled={syncingId === link.id}
                        className="px-3 py-1 rounded bg-[#BE1E2E] text-white text-xs font-semibold hover:bg-[#a61725] disabled:opacity-50"
                      >
                        {syncingId === link.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sync Runs History */}
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
          <History className="w-4 h-4 text-[#BE1E2E]" />
          Recent Sync Execution Runs
        </h2>
        {syncRuns.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No sync runs recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--brand-text)]">
              <thead className="bg-[var(--bg-surface-elevated)] font-semibold text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Roster Synced</th>
                  <th className="px-3 py-2">Coursework Synced</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {syncRuns.slice(0, 5).map((run) => (
                  <tr key={run.id}>
                    <td className="px-3 py-2 font-mono">{run.scope}</td>
                    <td className="px-3 py-2 font-bold">
                      <span className={run.status === 'COMPLETED' ? 'text-emerald-500' : 'text-amber-500'}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      Teachers: {run.counts?.teachersSynced || 0}, Students: {run.counts?.studentsSynced || 0}
                    </td>
                    <td className="px-3 py-2">
                      Assignments: {run.counts?.courseworkSynced || 0}, Grades: {run.counts?.gradesSynced || 0}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {run.completedAt
                        ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Batch Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[var(--brand-text)] flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-[#BE1E2E]" />
              Link Batch to Google Classroom
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--brand-text)] block mb-1">
                  Google Classroom Connection
                </label>
                <select
                  value={selectedConnectionId}
                  onChange={(e) => setSelectedConnectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-sm"
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.externalAccountId || c.id} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--brand-text)] block mb-1">
                  Select DIDM Batch (Cohort)
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-sm"
                >
                  <option value="">Select a batch...</option>
                  {batches.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name} ({b.batchCode || 'Batch'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--brand-text)] block mb-1">
                  Google Classroom External Course ID
                </label>
                <input
                  type="text"
                  value={selectedExternalCourseId}
                  onChange={(e) => setSelectedExternalCourseId(e.target.value)}
                  placeholder="e.g. gc_course_101 or numeric Google Classroom ID"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--brand-border)]">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[var(--brand-border)] text-xs font-semibold hover:bg-[var(--bg-surface-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedBatchId || !selectedExternalCourseId}
                className="px-4 py-2 rounded-lg bg-[#BE1E2E] text-white text-xs font-bold hover:bg-[#a61725] disabled:opacity-50"
              >
                Establish Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
