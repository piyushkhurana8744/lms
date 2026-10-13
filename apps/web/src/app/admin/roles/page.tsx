'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@edtech/ui';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  KeyRound,
  Search,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
}

interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}

interface IRole {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: string;
}

export default function RolesAndPermissionsPage() {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<IRole | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { confirm } = useConfirmation();

  const fetchRolesAndPermissions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/v1/roles'),
        fetch('/api/v1/roles/permissions')
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (rolesData.success && Array.isArray(rolesData.data)) {
          setRoles(rolesData.data);
          if (rolesData.data.length > 0 && !selectedRole) {
            setSelectedRole(rolesData.data[0]);
          }
        }
      }

      if (permsRes.ok) {
        const permsData = await permsRes.json();
        if (permsData.success && permsData.data?.categories) {
          setCategories(permsData.data.categories);
          // Expand all categories by default
          const exp: Record<string, boolean> = {};
          permsData.data.categories.forEach((cat: PermissionCategory) => {
            exp[cat.id] = true;
          });
          setExpandedCategories(exp);
        }
      }
    } catch {
      setErrorMessage('Failed to load roles and permissions. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const openCreateModal = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: IRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions([...role.permissions]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permKey: string) => {
    setFormPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  const handleToggleCategory = (categoryPermissions: PermissionDefinition[]) => {
    const keys = categoryPermissions.map((p) => p.key);
    const allSelected = keys.every((k) => formPermissions.includes(k));

    if (allSelected) {
      setFormPermissions((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setFormPermissions((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Role name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const url = editingRole ? `/api/v1/roles/${editingRole._id}` : '/api/v1/roles';
      const method = editingRole ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          permissions: formPermissions
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save role');
      }

      setSuccessMessage(editingRole ? 'Role updated successfully.' : 'Role created successfully.');
      setIsModalOpen(false);
      await fetchRolesAndPermissions();

      if (data.data) {
        setSelectedRole(data.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the role.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: IRole) => {
    if (role.isSystemRole) return;

    const shouldDelete = await confirm({
      title: `Delete Role: ${role.name}`,
      description: `Are you sure you want to permanently delete the custom role "${role.name}"? Users currently assigned this role will lose its custom permissions.`,
      confirmText: 'Delete Role',
      cancelText: 'Keep Role',
      type: 'danger'
    });

    if (!shouldDelete) return;

    try {
      const res = await fetch(`/api/v1/roles/${role._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete role');
      }

      setSuccessMessage(`Role "${role.name}" was successfully deleted.`);
      await fetchRolesAndPermissions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete role.');
    }
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();

    return categories
      .map((cat) => ({
        ...cat,
        permissions: cat.permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.key.toLowerCase().includes(term)
        )
      }))
      .filter((cat) => cat.permissions.length > 0 || cat.name.toLowerCase().includes(term));
  }, [categories, searchTerm]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-8 text-white shadow-2xl border border-red-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5" /> Granular Multi-Tenant RBAC
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Roles & Permissions Matrix
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Define administrative boundaries, instructor access levels, and granular custom permissions for team members within your organization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              variant="primary"
              className="flex items-center gap-2 shadow-lg shadow-red-600/30 font-bold px-4 py-2.5 rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </Button>
          </div>
        </div>

        {/* Decorative ambient glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Roles List (Left) + Permission Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Roles Cards */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Organization Roles ({roles.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <p className="text-xs text-[var(--text-muted)]">Loading roles...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => {
                const isSelected = selectedRole?._id === role._id;
                return (
                  <div
                    key={role._id}
                    onClick={() => setSelectedRole(role)}
                    className={`cursor-pointer group p-4 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-[var(--bg-surface)] border-red-500 shadow-md shadow-red-500/5 ring-1 ring-red-500/20'
                        : 'bg-[var(--bg-surface)]/60 border-[var(--brand-border)] hover:border-red-500/50 hover:bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[var(--brand-text)] group-hover:text-red-500 transition-colors">
                            {role.name}
                          </h3>
                          {role.isSystemRole ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Built-in
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Custom
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                          {role.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Edit Permissions"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(role);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/20 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!role.isSystemRole && (
                          <button
                            title="Delete Role"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--brand-border)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
                      <span>slug: {role.slug}</span>
                      <span className="font-semibold text-[var(--brand-text)]">
                        {role.permissions.length} perms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Permission Matrix for Selected Role */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-3xl border border-[var(--brand-border)] bg-[var(--bg-surface)] shadow-sm space-y-6">
            {selectedRole ? (
              <>
                {/* Role Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--brand-border)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-red-500" />
                      <h2 className="text-lg font-extrabold text-[var(--brand-text)]">
                        {selectedRole.name} Permissions
                      </h2>
                      {selectedRole.isSystemRole ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-bold border border-slate-500/20">
                          System Role
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold border border-red-500/20">
                          Custom Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {selectedRole.description || 'System managed role.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(selectedRole)}
                      className="flex items-center gap-1.5 text-xs font-semibold rounded-xl"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Permissions</span>
                    </Button>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search permissions by keyword or action (e.g., 'course', 'invite', 'publish')..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-text)] focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* Categories Matrix */}
                <div className="space-y-4">
                  {filteredCategories.map((category) => {
                    const isExpanded = expandedCategories[category.id] !== false;
                    const grantedCount = category.permissions.filter((p) =>
                      selectedRole.permissions.includes(p.key)
                    ).length;
                    const totalCount = category.permissions.length;

                    return (
                      <div
                        key={category.id}
                        className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-background)]/50 overflow-hidden"
                      >
                        {/* Category Header */}
                        <div
                          onClick={() => toggleCategoryExpand(category.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--brand-background)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Layers className="w-4 h-4 text-red-500" />
                            <div>
                              <h4 className="text-xs font-bold text-[var(--brand-text)]">
                                {category.name}
                              </h4>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                {category.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                grantedCount === totalCount
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : grantedCount > 0
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                              }`}
                            >
                              {grantedCount} / {totalCount} Granted
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </div>
                        </div>

                        {/* Permissions Grid */}
                        {isExpanded && (
                          <div className="p-4 pt-2 border-t border-[var(--brand-border)] grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {category.permissions.map((perm) => {
                              const isGranted = selectedRole.permissions.includes(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                                    isGranted
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-[var(--brand-text)]'
                                      : 'bg-slate-500/5 border-transparent opacity-60 text-[var(--text-muted)]'
                                  }`}
                                >
                                  <div className="mt-0.5 flex-shrink-0">
                                    {isGranted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-slate-500/40" />
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold leading-tight">
                                        {perm.label}
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-snug">{perm.description}</p>
                                    <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-1">
                                      {perm.key}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
                <Info className="w-8 h-8 opacity-40" />
                <p className="text-sm">Select a role from the left to view and configure its permissions.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--brand-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                <h3 className="font-extrabold text-base text-[var(--brand-text)]">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Custom Role'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRole} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)] block">Role Name *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystemRole}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Teaching Assistant, Branch Manager"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs text-[var(--brand-text)] focus:outline-none focus:border-red-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)] block">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of role responsibilities"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs text-[var(--brand-text)] focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Permission Checkboxes by Category */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[var(--brand-text)]">
                    Granted Permissions ({formPermissions.length} selected)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = categories.flatMap((c) => c.permissions.map((p) => p.key));
                        setFormPermissions(allKeys);
                      }}
                      className="text-[11px] text-red-500 hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--text-muted)]">•</span>
                    <button
                      type="button"
                      onClick={() => setFormPermissions([])}
                      className="text-[11px] text-[var(--text-muted)] hover:underline font-bold"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {categories.map((category) => {
                    const allCatSelected = category.permissions.every((p) =>
                      formPermissions.includes(p.key)
                    );

                    return (
                      <div
                        key={category.id}
                        className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)]/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--brand-border)]">
                          <span className="font-bold text-[var(--brand-text)]">{category.name}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(category.permissions)}
                            className="text-[10px] text-red-500 font-bold hover:underline"
                          >
                            {allCatSelected ? 'Deselect Category' : 'Select Category'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {category.permissions.map((perm) => {
                            const isChecked = formPermissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-red-500/10 border-red-500/30 text-[var(--brand-text)]'
                                    : 'bg-[var(--brand-background)] border-[var(--brand-border)] opacity-70 text-[var(--text-muted)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.key)}
                                  className="mt-0.5 rounded border-[var(--brand-border)] text-red-600 focus:ring-red-500"
                                />
                                <div className="space-y-0.5">
                                  <span className="font-bold block text-[11px]">{perm.label}</span>
                                  <span className="text-[10px] block opacity-80">{perm.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-xl font-bold"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRole ? 'Save Changes' : 'Create Role'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
