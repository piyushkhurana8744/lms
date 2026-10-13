'use client';

import React, { useState } from 'react';
import { Button } from '@edtech/ui';
import {
  User,
  Briefcase,
  GraduationCap,
  CreditCard,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Loader2,
  Plus,
  Building2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Award,
  FileText,
  Lock
} from 'lucide-react';
import { CreateEmployeeMemberPayload, OrganizationMemberRole } from '@edtech/types';

export interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEmployeeMemberPayload) => Promise<void>;
  isSubmitting: boolean;
}

const DEPARTMENTS = [
  'Academics & Training',
  'Admissions & Counseling',
  'Digital Marketing & Media',
  'Operations & Center Admin',
  'IT & Tech Support',
  'Finance & Accounts',
  'Human Resources (HR)',
  'Placement & Corporate Relations'
];

const BRANCHES = [
  'Noida Center (Sector 62)',
  'Delhi HQ (Pitampura)',
  'South Delhi (Kalu Sarai)',
  'Gurugram Center',
  'Jaipur Center',
  'Online / Virtual Branch'
];

const SUGGESTED_SKILLS = [
  'Search Engine Optimization (SEO)',
  'Google Ads / SEM',
  'Meta & Social Media Ads',
  'Content Marketing',
  'Email Marketing',
  'Graphic Design / Canva',
  'Website Development / WordPress',
  'Google Analytics 4 (GA4)',
  'Affiliate Marketing',
  'AI for Digital Marketing'
];

export function AddEmployeeModal({ isOpen, onClose, onSubmit, isSubmitting }: AddEmployeeModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateEmployeeMemberPayload>({
    name: '',
    email: '',
    phone: '',
    role: 'INSTRUCTOR',
    employeeId: '',
    designation: '',
    department: 'Academics & Training',
    branch: 'Noida Center (Sector 62)',
    employmentType: 'FULL_TIME',
    dateOfJoining: new Date().toISOString().split('T')[0],
    workMode: 'ON_SITE',
    password: '',
    personal: {
      dob: '',
      gender: 'MALE',
      bloodGroup: '',
      alternatePhone: '',
      emergencyContact: { name: '', relation: '', phone: '' },
      address: { street: '', city: '', state: '', pincode: '' }
    },
    academic: {
      highestQualification: '',
      skills: ['Search Engine Optimization (SEO)', 'Google Ads / SEM'],
      experienceYears: 2,
      bio: '',
      linkedinUrl: ''
    },
    kyc: {
      aadhaarNumber: '',
      panNumber: ''
    },
    bank: {
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: ''
    }
  });

  const [skillInput, setSkillInput] = useState('');

  if (!isOpen) return null;

  const handleTextChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePersonalChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      personal: {
        ...(prev.personal || {}),
        [field]: value
      }
    }));
  };

  const handleAddressChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      personal: {
        ...(prev.personal || {}),
        address: {
          ...(prev.personal?.address || {}),
          [field]: value
        }
      }
    }));
  };

  const handleAcademicChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      academic: {
        ...(prev.academic || {}),
        [field]: value
      }
    }));
  };

  const handleKycChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      kyc: {
        ...(prev.kyc || {}),
        [field]: value
      }
    }));
  };

  const handleBankChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      bank: {
        ...(prev.bank || {}),
        [field]: value
      }
    }));
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    const currentSkills = formData.academic?.skills || [];
    if (!currentSkills.includes(trimmed)) {
      handleAcademicChange('skills', [...currentSkills, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skillToRemove: string) => {
    const currentSkills = formData.academic?.skills || [];
    handleAcademicChange(
      'skills',
      currentSkills.filter((s) => s !== skillToRemove)
    );
  };

  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        setErrorMsg('Please enter employee full name (minimum 2 characters).');
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setErrorMsg('Please enter a valid official email address.');
        return false;
      }
      if (formData.phone && formData.phone.trim().length < 10) {
        setErrorMsg('Please enter a valid 10-digit phone number.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.designation?.trim()) {
        setErrorMsg('Please enter a designation/job title (e.g., Senior Trainer, Counselor).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    try {
      setErrorMsg(null);
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to onboard employee.');
    }
  };

  const steps = [
    { num: 1, title: 'Personal Info', icon: User },
    { num: 2, title: 'Job & Role', icon: Briefcase },
    { num: 3, title: 'Skills & Bio', icon: GraduationCap },
    { num: 4, title: 'KYC & Bank', icon: CreditCard }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-2xl w-full my-6 shadow-2xl text-[var(--brand-text)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--bg-surface-elevated)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 flex items-center justify-center text-[#BE1E2E]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-[var(--brand-text)]">
                Employee Onboarding Form
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Add complete employee, trainer, or staff record to your institute
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

        {/* Wizard Step Progress Bar */}
        <div className="px-6 py-3 bg-[var(--brand-background)] border-b border-[var(--brand-border)] flex-shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (isDone) setCurrentStep(step.num);
                  }}
                  className={`flex items-center gap-1.5 p-1.5 sm:p-2 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-[var(--bg-surface-elevated)] border border-[#BE1E2E]/40 text-[#BE1E2E] shadow-sm'
                      : isDone
                      ? 'text-emerald-500 hover:bg-[var(--bg-surface-elevated)]'
                      : 'text-[var(--text-muted)] opacity-60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive
                        ? 'bg-[#BE1E2E] text-white'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--brand-border)] text-[var(--text-muted)]'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <div className="hidden sm:block truncate">
                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold">
                      {step.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* STEP 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)]">
                <User className="w-4 h-4 text-[#BE1E2E]" /> Basic Personal Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Full Name <span className="text-[#BE1E2E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => handleTextChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Official Email <span className="text-[#BE1E2E]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@didm.in"
                    value={formData.email}
                    onChange={(e) => handleTextChange('email', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Primary Mobile Number <span className="text-[#BE1E2E]">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone || ''}
                    onChange={(e) => handleTextChange('phone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Alternate / Emergency Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="Alternate contact number"
                    value={formData.personal?.alternatePhone || ''}
                    onChange={(e) => handlePersonalChange('alternatePhone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={(formData.personal?.dob as string) || ''}
                    onChange={(e) => handlePersonalChange('dob', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.personal?.gender || 'MALE'}
                      onChange={(e) => handlePersonalChange('gender', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.personal?.bloodGroup || ''}
                      onChange={(e) => handlePersonalChange('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address details */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)] mb-3">
                  <MapPin className="w-3.5 h-3.5 text-[#BE1E2E]" /> Residential Address
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Street Address, House / Flat No."
                      value={formData.personal?.address?.street || ''}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City (e.g. Noida)"
                      value={formData.personal?.address?.city || ''}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State (e.g. Uttar Pradesh)"
                      value={formData.personal?.address?.state || ''}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pincode (e.g. 201301)"
                      value={formData.personal?.address?.pincode || ''}
                      onChange={(e) => handleAddressChange('pincode', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Job & Employment Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)]">
                <Briefcase className="w-4 h-4 text-[#BE1E2E]" /> Employment & Designation Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Employee ID / Staff Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DIDM-EMP-101 (Leave blank to auto-generate)"
                    value={formData.employeeId || ''}
                    onChange={(e) => handleTextChange('employeeId', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono focus:outline-none focus:border-[#BE1E2E]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Auto-generated if left blank
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Designation / Job Title <span className="text-[#BE1E2E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Digital Marketing Trainer"
                    value={formData.designation || ''}
                    onChange={(e) => handleTextChange('designation', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department || DEPARTMENTS[0]}
                    onChange={(e) => handleTextChange('department', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Branch / Campus / Center
                  </label>
                  <select
                    value={formData.branch || BRANCHES[0]}
                    onChange={(e) => handleTextChange('branch', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  >
                    {BRANCHES.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    System Access Role <span className="text-[#BE1E2E]">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleTextChange('role', e.target.value as OrganizationMemberRole)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-bold focus:outline-none focus:border-[#BE1E2E]"
                  >
                    <option value="INSTRUCTOR">Instructor / Trainer (Can manage & teach courses)</option>
                    <option value="TENANT_ADMIN">Tenant Admin (Full Institute management access)</option>
                    <option value="STUDENT">Staff / Student Role (Restricted / Standard view)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formData.employmentType || 'FULL_TIME'}
                    onChange={(e) => handleTextChange('employmentType', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  >
                    <option value="FULL_TIME">Full-Time (Permanent)</option>
                    <option value="PART_TIME">Part-Time</option>
                    <option value="CONTRACT">Contractual</option>
                    <option value="VISITING">Visiting Faculty / Freelancer</option>
                    <option value="INTERN">Intern / Trainee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Work Mode
                  </label>
                  <select
                    value={formData.workMode || 'ON_SITE'}
                    onChange={(e) => handleTextChange('workMode', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  >
                    <option value="ON_SITE">On-Site (At Branch)</option>
                    <option value="REMOTE">Remote / Work From Home</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Date of Joining (DOJ)
                  </label>
                  <input
                    type="date"
                    value={(formData.dateOfJoining as string) || ''}
                    onChange={(e) => handleTextChange('dateOfJoining', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Academic & Trainer Profile */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)]">
                <GraduationCap className="w-4 h-4 text-[#BE1E2E]" /> Academic & Faculty Profile
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Highest Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MBA in Marketing, B.Tech, MCA"
                    value={formData.academic?.highestQualification || ''}
                    onChange={(e) => handleAcademicChange('highestQualification', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Total Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 5"
                    value={formData.academic?.experienceYears ?? 0}
                    onChange={(e) => handleAcademicChange('experienceYears', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Specializations & Core Skills
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Type a skill and press Add (e.g. Google Tag Manager)"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill(skillInput);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSkill(skillInput)}
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>

                  {/* Active Skill Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {(formData.academic?.skills || []).map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 text-[#BE1E2E] text-[11px] font-bold flex items-center gap-1.5"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-red-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Suggested Skill Pills */}
                  <div className="p-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
                    <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold mb-1.5 uppercase">
                      Suggested Skills (Click to add):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTED_SKILLS.filter(
                        (s) => !(formData.academic?.skills || []).includes(s)
                      ).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSkill(s)}
                          className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E] text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.academic?.linkedinUrl || ''}
                    onChange={(e) => handleAcademicChange('linkedinUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Trainer Bio / Professional Summary
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the employee's background, training philosophy, and achievements (shown on public course pages for instructors)..."
                    value={formData.academic?.bio || ''}
                    onChange={(e) => handleAcademicChange('bio', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: KYC, Bank & Portal Access */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* KYC Information */}
              <div>
                <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)] mb-3">
                  <FileText className="w-4 h-4 text-[#BE1E2E]" /> Identity & KYC Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      Aadhaar Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit Aadhaar Number"
                      maxLength={14}
                      value={formData.kyc?.aadhaarNumber || ''}
                      onChange={(e) => handleKycChange('aadhaarNumber', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="10-digit PAN (e.g. ABCDE1234F)"
                      maxLength={10}
                      value={formData.kyc?.panNumber || ''}
                      onChange={(e) => handleKycChange('panNumber', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono uppercase focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Information */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)] mb-3">
                  <CreditCard className="w-4 h-4 text-[#BE1E2E]" /> Payroll & Bank Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank / SBI / ICICI"
                      value={formData.bank?.bankName || ''}
                      onChange={(e) => handleBankChange('bankName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="Name as per bank account"
                      value={formData.bank?.accountHolderName || ''}
                      onChange={(e) => handleBankChange('accountHolderName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="Bank account number"
                      value={formData.bank?.accountNumber || ''}
                      onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.bank?.ifscCode || ''}
                      onChange={(e) => handleBankChange('ifscCode', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono uppercase focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. employee@okaxis"
                      value={formData.bank?.upiId || ''}
                      onChange={(e) => handleBankChange('upiId', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                </div>
              </div>

              {/* Login Password setup */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1.5 pb-1 border-b border-[var(--brand-border)] mb-3">
                  <Lock className="w-4 h-4 text-[#BE1E2E]" /> Portal Login Password (Optional)
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                    Set Initial Password
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to auto-generate secure login password"
                    value={formData.password || ''}
                    onChange={(e) => handleTextChange('password', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    If left blank, system generates a random temporary password. The employee can reset their password on first login.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] flex items-center justify-between flex-shrink-0">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
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

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNext}
                className="flex items-center gap-1 text-xs btn-primary shadow-md shadow-[#BE1E2E]/20"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-xs btn-primary shadow-lg shadow-[#BE1E2E]/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Onboarding...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Complete Employee Onboarding
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
