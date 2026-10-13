'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { Search, Filter, ArrowRight, UserCheck, ShieldAlert, GraduationCap, Clock, AlertCircle } from 'lucide-react';

export default function StudentDirectoryPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const studentsQuery = useQuery({
    queryKey: ['admin-students-directory', search, status, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/v1/students?${params.toString()}`);
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (!res.ok) throw new Error(json.message || json.error?.message || 'Failed to load students');
      return json.data;
    }
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Active</span>;
      case 'PENDING_ACTIVATION':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Pending Activation</span>;
      case 'ON_HOLD':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">On Hold</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Completed</span>;
      case 'WITHDRAWN':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Withdrawn</span>;
      case 'DROPPED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">Dropped</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800">{st}</span>;
    }
  };

  const students = studentsQuery.data?.data || [];
  const pagination = studentsQuery.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Student Directory & Lifecycle
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage student academic standings, cohort assignments, transfers, holds, and completion.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by student ID, name, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_ACTIVATION">Pending Activation</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="DROPPED">Dropped</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {studentsQuery.isLoading ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-3">
            <Clock className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-sm">Loading student directory...</p>
          </div>
        ) : studentsQuery.isError ? (
          <div className="p-12 text-center text-rose-600 dark:text-rose-400 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <p className="text-sm">{(studentsQuery.error as Error).message || 'Failed to fetch student directory'}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-2">
            <UserCheck className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">No students found</p>
            <p className="text-sm">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Student ID & Name</th>
                  <th className="px-6 py-3.5">Course / Program</th>
                  <th className="px-6 py-3.5">Cohort / Batch</th>
                  <th className="px-6 py-3.5">Standing</th>
                  <th className="px-6 py-3.5">Progress</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {students.map((st: any) => (
                  <tr key={st.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{st.student?.name || 'Unknown Student'}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{st.studentNumber || '—'}</span>
                        <span className="text-xs text-zinc-400">{st.student?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{st.course?.title || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {st.batch ? (
                        <div className="flex flex-col">
                          <span className="text-zinc-800 dark:text-zinc-200 font-medium">{st.batch.name}</span>
                          <span className="text-xs text-zinc-500">{st.batch.mode}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">No Batch Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(st.currentStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, st.progressPercent || 0))}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{st.progressPercent || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {st.student?.id ? (
                        <Link
                          href={`/admin/students/${st.student.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          Workspace <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
