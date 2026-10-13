'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IOrganizationMember,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  TeamSummaryStats,
  CreateEmployeeMemberPayload
} from '@edtech/types';
import { Button, Card, Badge } from '@edtech/ui';
import { InviteMemberDialog } from '@/components/team/InviteMemberDialog';
import { AddEmployeeModal } from '@/components/team/AddEmployeeModal';
import { MemberDetailsDrawer } from '@/components/team/MemberDetailsDrawer';
import { ChangeMemberRoleDialog } from '@/components/team/ChangeMemberRoleDialog';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import {
  Users,
  UserPlus,
  Shield,
  BookOpen,
  GraduationCap,
  Mail,
  UserX,
  Search,
  Filter,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  ShieldAlert,
  Trash2,
  CheckCircle,
  Loader2,
  Building2
} from 'lucide-react';

export default function AdminTeamDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedDrawerMember, setSelectedDrawerMember] = useState<IOrganizationMember | null>(null);
  const [roleDialogMember, setRoleDialogMember] = useState<IOrganizationMember | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch Team Members
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['organization-members', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '10');

      const res = await fetch(`/api/v1/organization/members?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch team members');
      }
      return res.json();
    }
  });

  const members: IOrganizationMember[] = data?.data || [];
  const stats: TeamSummaryStats = data?.stats || {
    totalMembers: 0,
    adminsCount: 0,
    instructorsCount: 0,
    studentsCount: 0,
    pendingInvitationsCount: 0,
    suspendedCount: 0
  };
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: OrganizationMemberRole }) => {
      const res = await fetch('/api/v1/organization/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to send invitation');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Invitation sent');
      return data;
    },
    onError: (err: Error) => {
      showError({ title: 'Invitation Failed', message: err.message });
    }
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (payload: CreateEmployeeMemberPayload) => {
      const res = await fetch('/api/v1/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to onboard employee');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Employee onboarded successfully');
      setIsAddEmployeeModalOpen(false);
    },
    onError: (err: Error) => {
      showError({ title: 'Onboarding Failed', message: err.message });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: OrganizationMemberRole }) => {
      const res = await fetch(`/api/v1/organization/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update role');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      showToast('Role updated');
    },
    onError: (err: Error) => {
      showError({ title: 'Role Update Failed', message: err.message });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: OrganizationMemberStatus }) => {
      const res = await fetch(`/api/v1/organization/members/${memberId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `Failed to update status to ${status}`);
      return json.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      const msgMap: Record<string, string> = {
        SUSPENDED: 'Member suspended',
        ACTIVE: 'Member activated',
        REMOVED: 'Member removed'
      };
      showToast(msgMap[variables.status] || 'Status updated');
    },
    onError: (err: Error) => {
      showError({ title: 'Action Failed', message: err.message });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/v1/organization/members/${memberId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to remove member');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      showToast('Member removed');
    },
    onError: (err: Error) => {
      showError({ title: 'Removal Failed', message: err.message });
    }
  });

  const handleSuspend = async (member: IOrganizationMember) => {
    await confirm({
      title: 'Suspend Organization Member?',
      description: `Suspending ${member.user?.name || member.user?.email} will prevent them from accessing the organization console.`,
      confirmText: 'Suspend Member',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        await updateStatusMutation.mutateAsync({ memberId: member.id, status: 'SUSPENDED' });
      }
    });
  };

  const handleActivate = async (member: IOrganizationMember) => {
    await confirm({
      title: 'Activate Organization Member?',
      description: `Activate ${member.user?.name || member.user?.email} to grant active organization access.`,
      confirmText: 'Activate Member',
      cancelText: 'Cancel',
      type: 'primary',
      onConfirm: async () => {
        await updateStatusMutation.mutateAsync({ memberId: member.id, status: 'ACTIVE' });
      }
    });
  };

  const handleRemove = async (member: IOrganizationMember) => {
    await confirm({
      title: 'Remove Member from Organization?',
      description: `Removing ${member.user?.name || member.user?.email} will revoke their organization membership immediately.`,
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        await removeMutation.mutateAsync(member.id);
      }
    });
  };


  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/organization');
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
            <Users className="w-4 h-4" /> Organization Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Team & Members
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage administrators, instructors, and students in your organization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Quick Invite
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-1.5 text-xs btn-primary shadow-lg shadow-[#BE1E2E]/20"
          >
            <UserPlus className="w-4 h-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-[var(--text-muted)] font-mono font-bold">Total Members</div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.totalMembers}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-purple-500 font-mono font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Admins
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.adminsCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-blue-500 font-mono font-bold flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Instructors
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.instructorsCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-emerald-500 font-mono font-bold flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Students
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.studentsCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-amber-500 font-mono font-bold flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Pending
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.pendingInvitationsCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
          <div className="text-red-500 font-mono font-bold flex items-center gap-1">
            <UserX className="w-3.5 h-3.5" /> Suspended
          </div>
          <div className="text-2xl font-black text-[var(--brand-text)]">{stats.suspendedCount}</div>
        </Card>
      </div>

      {/* Controls Bar: Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by member name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="font-bold text-[var(--text-muted)] font-mono">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="STUDENT">Student</option>
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
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
          <p>Loading Organization Members...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
          Failed to load organization members: {(error as Error)?.message}
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl bg-[var(--bg-surface-elevated)] space-y-3">
          <Users className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="font-extrabold text-sm text-[var(--brand-text)]">No organization members found</h3>
          <p className="text-xs text-[var(--text-muted)]">Try adjusting your search query or filter settings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--brand-background)] border-b border-[var(--brand-border)] text-[var(--text-muted)] uppercase font-mono font-bold text-[11px]">
                <tr>
                  <th className="p-4">Employee / Member</th>
                  <th className="p-4">Designation & Department</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)] text-[var(--brand-text)]">
                {members.map((member) => {
                  const emp = member.employeeDetails;
                  const roleBadge =
                    member.role === 'TENANT_ADMIN'
                      ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                      : member.role === 'INSTRUCTOR'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';

                  const statusBadge =
                    member.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : member.status === 'SUSPENDED'
                      ? 'bg-red-500/10 text-red-500 border-red-500/30'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30';

                  return (
                    <tr key={member.id} className="hover:bg-[var(--brand-background)]/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 overflow-hidden flex items-center justify-center font-extrabold text-xs text-[#BE1E2E] flex-shrink-0">
                            {member.user?.avatarUrl ? (
                              <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
                            ) : (
                              (member.user?.name || 'M')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs">{member.user?.name || 'Member'}</span>
                              {emp?.employeeId && (
                                <span className="px-1.5 py-0.2 rounded bg-[var(--brand-background)] border border-[var(--brand-border)] font-mono text-[9px] font-bold text-[#BE1E2E]">
                                  {emp.employeeId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">{member.user?.email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {emp?.designation ? (
                          <div>
                            <div className="font-bold text-xs">{emp.designation}</div>
                            <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                              {emp.department || 'General'} {emp.branch ? `• ${emp.branch}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">Staff Profile</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase font-mono tracking-wider ${roleBadge}`}>
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase font-mono tracking-wider ${statusBadge}`}>
                          ● {member.status}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">
                        {emp?.dateOfJoining
                          ? new Date(emp.dateOfJoining).toLocaleDateString()
                          : member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : 'Pending'}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDrawerMember(member)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--brand-background)]"
                            title="View Member Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRoleDialogMember(member)}
                            className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-500/10"
                            title="Change Role"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          {member.status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              onClick={() => handleActivate(member)}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10"
                              title="Activate Member"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSuspend(member)}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10"
                              title="Suspend Member"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                            title="Remove Member"
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

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] font-mono">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total members)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSendInvite={(email, role) => inviteMutation.mutateAsync({ email, role })}
        isPending={inviteMutation.isPending}
      />

      {/* Complete Add Employee Wizard Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onSubmit={async (payload) => {
          await addEmployeeMutation.mutateAsync(payload);
        }}
        isSubmitting={addEmployeeMutation.isPending}
      />

      {/* Member Details Drawer */}
      <MemberDetailsDrawer
        isOpen={Boolean(selectedDrawerMember)}
        member={selectedDrawerMember}
        onClose={() => setSelectedDrawerMember(null)}
        onChangeRole={(m) => setRoleDialogMember(m)}
        onSuspend={(m) => handleSuspend(m)}
        onActivate={(m) => handleActivate(m)}
        onRemove={(m) => handleRemove(m)}
      />

      {/* Change Role Dialog */}
      <ChangeMemberRoleDialog
        isOpen={Boolean(roleDialogMember)}
        member={roleDialogMember}
        onClose={() => setRoleDialogMember(null)}
        onConfirm={async (newRole) => {
          if (roleDialogMember) {
            await updateRoleMutation.mutateAsync({ memberId: roleDialogMember.id, role: newRole });
          }
        }}
        isPending={updateRoleMutation.isPending}
      />
    </div>
  );
}
