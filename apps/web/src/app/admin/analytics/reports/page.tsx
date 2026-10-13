'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Download, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { ExportButton } from '@/components/analytics/ExportButton';

const REPORT_OPTIONS = [
  { key: 'STUDENT_ROSTER', label: 'Student Active Roster' },
  { key: 'STUDENT_LIFECYCLE_HISTORY', label: 'Student Lifecycle Transitions' },
  { key: 'LEAD_ACQUISITION', label: 'CRM Leads & Acquisition' },
  { key: 'ADMISSION_CONVERSIONS', label: 'Admission Conversions' },
  { key: 'FINANCE_COLLECTIONS', label: 'Finance Collections & Payments' },
  { key: 'FINANCE_AGING_DUES', label: 'Finance Aging Dues & Receivables' },
  { key: 'ATTENDANCE_SUMMARY', label: 'Finalized Attendance Summary' },
  { key: 'LOW_ATTENDANCE_STUDENTS', label: 'Low Attendance Alert List' },
  { key: 'ACADEMIC_CLASS_SCHEDULE', label: 'Academic Classes & Schedule' },
  { key: 'INSTRUCTOR_WORKLOAD', label: 'Instructor Workload & Delivery' },
];

export default function ReportsHubPage() {
  const [selectedReport, setSelectedReport] = useState('STUDENT_ROSTER');
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (preset === 'custom' && customFrom && customTo) {
        params.set('from', customFrom);
        params.set('to', customTo);
      } else {
        params.set('preset', preset);
      }
      if (branchId) params.set('branchId', branchId);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/v1/analytics/reports/${selectedReport}?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch report (Status ${res.status})`);
      }
      const json = await res.json();
      setReportData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load report data');
    } finally {
      setLoading(false);
    }
  }, [selectedReport, preset, branchId, customFrom, customTo, page, pageSize]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleReportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReport(e.target.value);
    setPage(1);
  };

  const rawData = reportData?.data || [];
  const columns = rawData.length > 0
    ? Object.keys(rawData[0]).filter((k) => k !== '_id' && k !== '__v' && k !== 'tenantId').slice(0, 8)
    : ['ID', 'Details'];
  const rows = rawData;
  const pagination = reportData?.pagination;

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Operational Reports & Exports
          </h1>
          <p className="text-sm text-muted-foreground">
            Server-paginated detailed analytical reports with whitelisted sorting and secure CSV export.
          </p>
        </div>
        <ExportButton
          reportKey={selectedReport}
          query={{ preset, branchId, from: customFrom, to: customTo }}
          label="Download CSV"
        />
      </div>

      {/* Control Bar: Report Picker + Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-foreground">Select Report:</label>
          <select
            value={selectedReport}
            onChange={handleReportChange}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select Report Dataset"
          >
            {REPORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <AnalyticsFilterBar
          preset={preset}
          onPresetChange={(p) => {
            setPreset(p);
            setPage(1);
          }}
          branchId={branchId}
          onBranchChange={(b) => {
            setBranchId(b);
            setPage(1);
          }}
          from={customFrom}
          to={customTo}
          onCustomRangeChange={(f, t) => {
            setCustomFrom(f);
            setCustomTo(t);
            setPage(1);
          }}
          onRefresh={fetchReport}
          loading={loading}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                {columns.map((col: any) => (
                  <th key={col.key} className="p-4 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((col: any) => (
                      <td key={col.key} className="p-4">
                        <div className="h-4 w-24 rounded bg-muted"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="p-8 text-center text-muted-foreground">
                    No data records match this query.
                  </td>
                </tr>
              ) : (
                rows.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-accent/40 transition-colors">
                    {columns.map((col: any) => (
                      <td key={col.key} className="p-4 whitespace-nowrap text-foreground font-medium text-xs">
                        {row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">
              Showing page <span className="font-semibold text-foreground">{pagination.page}</span> of{' '}
              <span className="font-semibold text-foreground">{pagination.totalPages || 1}</span> (Total:{' '}
              <span className="font-semibold text-foreground">{pagination.total}</span> records)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => (pagination.totalPages && p < pagination.totalPages ? p + 1 : p))}
                disabled={!pagination.totalPages || page >= pagination.totalPages || loading}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
