'use client';

import React, { useState } from 'react';
import { IOrganizationMember } from '@edtech/types';
import { Button } from '@edtech/ui';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  X,
  UserX,
  UserCheck,
  ShieldAlert,
  Trash2,
  Briefcase,
  GraduationCap,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  Award
} from 'lucide-react';

export interface MemberDetailsDrawerProps {
  isOpen: boolean;
  member: IOrganizationMember | null;
  onClose: () => void;
  onChangeRole: (member: IOrganizationMember) => void;
  onSuspend: (member: IOrganizationMember) => void;
  onActivate: (member: IOrganizationMember) => void;
  onRemove: (member: IOrganizationMember) => void;
}

export function MemberDetailsDrawer({
  isOpen,
  member,
  onClose,
  onChangeRole,
  onSuspend,
  onActivate,
  onRemove
}: MemberDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'job' | 'personal' | 'academic' | 'kyc'>('job');

  if (!isOpen || !member) return null;

  const emp = member.employeeDetails;

  const roleBadgeColor =
    member.role === 'TENANT_ADMIN'
      ? 'bg-purple-500/10 border-purple-500/30 text-purple-500'
      : member.role === 'INSTRUCTOR'
      ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500';

  const statusBadgeColor =
    member.status === 'ACTIVE'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
      : member.status === 'SUSPENDED'
      ? 'bg-red-500/10 border-red-500/30 text-red-500'
      : 'bg-amber-500/10 border-amber-500/30 text-amber-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-[var(--bg-surface)] border-l border-[var(--brand-border)] min-h-screen p-6 space-y-6 shadow-2xl overflow-y-auto text-[var(--brand-text)] flex flex-col justify-between">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <User className="w-5 h-5 text-[#BE1E2E]" /> Employee Profile
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--brand-background)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Member Profile Avatar & Badges */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-center space-y-3">
            <div className="w-18 h-18 mx-auto rounded-full bg-[#BE1E2E]/10 border-2 border-[#BE1E2E]/40 overflow-hidden flex items-center justify-center font-extrabold text-2xl text-[#BE1E2E] w-16 h-16">
              {member.user?.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (member.user?.name || 'M')[0].toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h4 className="font-extrabold text-base text-[var(--brand-text)]">
                  {member.user?.name || 'Organization Member'}
                </h4>
                {emp?.employeeId && (
                  <span className="px-2 py-0.5 rounded-md bg-[var(--brand-background)] border border-[var(--brand-border)] font-mono text-[10px] font-bold text-[#BE1E2E]">
                    {emp.employeeId}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                {member.user?.email || 'No email'}
              </p>
              {emp?.designation && (
                <p className="text-xs font-bold text-[var(--brand-text)] mt-1">
                  {emp.designation} {emp.department ? `• ${emp.department}` : ''}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs">
              <span
                className={`px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider text-[10px] font-mono ${roleBadgeColor}`}
              >
                {member.role.replace('_', ' ')}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider text-[10px] font-mono ${statusBadgeColor}`}
              >
                ● {member.status}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--brand-border)] text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('job')}
              className={`flex-1 pb-2 flex items-center justify-center gap-1 border-b-2 transition-all ${
                activeTab === 'job'
                  ? 'border-[#BE1E2E] text-[#BE1E2E]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> Job Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex-1 pb-2 flex items-center justify-center gap-1 border-b-2 transition-all ${
                activeTab === 'personal'
                  ? 'border-[#BE1E2E] text-[#BE1E2E]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Personal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('academic')}
              className={`flex-1 pb-2 flex items-center justify-center gap-1 border-b-2 transition-all ${
                activeTab === 'academic'
                  ? 'border-[#BE1E2E] text-[#BE1E2E]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Skills
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kyc')}
              className={`flex-1 pb-2 flex items-center justify-center gap-1 border-b-2 transition-all ${
                activeTab === 'kyc'
                  ? 'border-[#BE1E2E] text-[#BE1E2E]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Bank/KYC
            </button>
          </div>

          {/* TAB 1: Job Info */}
          {activeTab === 'job' && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Employee ID</span>
                <span className="font-mono font-bold">{emp?.employeeId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Designation</span>
                <span className="font-bold">{emp?.designation || 'Staff Member'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Department</span>
                <span className="font-medium">{emp?.department || 'General'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Branch / Center</span>
                <span className="font-medium">{emp?.branch || 'Main Center'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Employment Type</span>
                <span className="font-medium">{emp?.employmentType?.replace('_', ' ') || 'Full Time'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Work Mode</span>
                <span className="font-medium">{emp?.workMode?.replace('_', ' ') || 'On Site'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Date of Joining</span>
                <span className="font-mono">
                  {emp?.dateOfJoining
                    ? new Date(emp.dateOfJoining).toLocaleDateString()
                    : member.joinedAt
                    ? new Date(member.joinedAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Last Active</span>
                <span className="font-mono">
                  {member.user?.lastLoginAt ? new Date(member.user.lastLoginAt).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Personal Info */}
          {activeTab === 'personal' && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Primary Mobile</span>
                <span className="font-mono font-bold">{member.user?.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Alternate Phone</span>
                <span className="font-mono">{emp?.personal?.alternatePhone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Date of Birth</span>
                <span className="font-mono">
                  {emp?.personal?.dob ? new Date(emp.personal.dob).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Gender</span>
                <span>{emp?.personal?.gender || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Blood Group</span>
                <span className="font-bold text-[#BE1E2E]">{emp?.personal?.bloodGroup || 'N/A'}</span>
              </div>

              {/* Address */}
              <div className="pt-2 border-t border-[var(--brand-border)]">
                <div className="text-[var(--text-muted)] font-bold mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Residential Address:
                </div>
                {emp?.personal?.address?.street || emp?.personal?.address?.city ? (
                  <p className="text-[var(--brand-text)] leading-relaxed">
                    {emp.personal.address.street && `${emp.personal.address.street}, `}
                    {emp.personal.address.city && `${emp.personal.address.city}, `}
                    {emp.personal.address.state && `${emp.personal.address.state} `}
                    {emp.personal.address.pincode && `- ${emp.personal.address.pincode}`}
                  </p>
                ) : (
                  <p className="text-[var(--text-muted)] italic">No address recorded</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Academic & Trainer Profile */}
          {activeTab === 'academic' && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Highest Qualification</span>
                <span className="font-bold">{emp?.academic?.highestQualification || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Total Experience</span>
                <span className="font-mono font-bold">
                  {emp?.academic?.experienceYears ? `${emp.academic.experienceYears} Years` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-1.5 font-bold">Specializations & Skills:</span>
                {emp?.academic?.skills && emp.academic.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {emp.academic.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 text-[#BE1E2E] text-[10px] font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)] italic">No skills specified</p>
                )}
              </div>

              {emp?.academic?.linkedinUrl && (
                <div className="pt-2 border-t border-[var(--brand-border)] flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">LinkedIn Profile</span>
                  <a
                    href={emp.academic.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#BE1E2E] hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    View Profile <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {emp?.academic?.bio && (
                <div className="pt-2 border-t border-[var(--brand-border)]">
                  <span className="text-[var(--text-muted)] block mb-1 font-bold">Trainer Bio:</span>
                  <p className="text-[var(--brand-text)] leading-relaxed italic bg-[var(--brand-background)] p-2.5 rounded-xl border border-[var(--brand-border)]">
                    &ldquo;{emp.academic.bio}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: KYC & Bank Details */}
          {activeTab === 'kyc' && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3 text-xs">
              <div className="text-[11px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider pb-1 border-b border-[var(--brand-border)]">
                KYC Identity
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">PAN Card</span>
                <span className="font-mono font-bold">{emp?.kyc?.panNumber || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Aadhaar Card</span>
                <span className="font-mono font-bold">{emp?.kyc?.aadhaarNumber || 'Not provided'}</span>
              </div>

              <div className="text-[11px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider pt-2 pb-1 border-b border-[var(--brand-border)]">
                Payroll & Bank
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Bank Name</span>
                <span className="font-bold">{emp?.bank?.bankName || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Account Holder</span>
                <span>{emp?.bank?.accountHolderName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Account Number</span>
                <span className="font-mono font-bold">{emp?.bank?.accountNumber || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">IFSC Code</span>
                <span className="font-mono font-bold">{emp?.bank?.ifscCode || 'Not provided'}</span>
              </div>
              {emp?.bank?.upiId && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">UPI ID</span>
                  <span className="font-mono text-[#BE1E2E]">{emp.bank.upiId}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Management Actions */}
        <div className="space-y-2 pt-4 border-t border-[var(--brand-border)]">
          <h5 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Management Actions
          </h5>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChangeRole(member)}
            className="w-full flex items-center justify-center gap-2 text-xs"
          >
            <ShieldAlert className="w-4 h-4 text-purple-500" />
            <span>Change Member Role</span>
          </Button>

          {member.status === 'SUSPENDED' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onActivate(member)}
              className="w-full flex items-center justify-center gap-2 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <UserCheck className="w-4 h-4" />
              <span>Activate Member</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSuspend(member)}
              className="w-full flex items-center justify-center gap-2 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
            >
              <UserX className="w-4 h-4" />
              <span>Suspend Member</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemove(member)}
            className="w-full flex items-center justify-center gap-2 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove from Organization</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
