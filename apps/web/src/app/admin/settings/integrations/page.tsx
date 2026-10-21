'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { PERMISSIONS } from '@edtech/permissions';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Video,
  GraduationCap,
  Layers
} from 'lucide-react';
import { IIntegrationConnectionDTO, IProviderMetadataDTO } from '@edtech/types';

export default function IntegrationsSettingsPage() {
  const { hasAnyPermission } = useAuth();
  const [providers, setProviders] = useState<IProviderMetadataDTO[]>([]);
  const [connections, setConnections] = useState<IIntegrationConnectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<Record<string, { healthy: boolean; message?: string }>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const canManage = hasAnyPermission?.([
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE
  ]) ?? false;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provRes, connRes] = await Promise.all([
        fetch('/api/v1/integrations/providers'),
        fetch('/api/v1/integrations/connections')
      ]);

      if (provRes.ok) {
        const pData = await provRes.json();
        setProviders(pData.data || []);
      }

      if (connRes.ok) {
        const cData = await connRes.json();
        setConnections(cData.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch integrations data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const query = new URLSearchParams(window.location.search);
    if (query.get('oauth') === 'success') setFeedback({ type: 'success', message: `${query.get('provider') || 'Provider'} connected successfully.` });
    if (query.get('oauth') === 'error') setFeedback({ type: 'error', message: `Authorization was not completed (${query.get('code') || 'provider error'}). No connection was created.` });
  }, []);

  const handleConnect = async (provider: string) => {
    try {
      setActionLoading(provider);
      setFeedback(null);
      const res = await fetch(`/api/v1/integrations/connections/${provider.toLowerCase()}/oauth-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scopeType: 'TENANT', redirectUrl: '/admin/settings/integrations' })
      });
      const payload = await res.json();
      if (!res.ok || !payload?.data?.authUrl) throw new Error(payload?.error?.message || 'OAuth authorization could not be started');
      window.location.assign(payload.data.authUrl);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Connection setup could not be started' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      setActionLoading(connectionId);
      const res = await fetch(`/api/v1/integrations/connections/${connectionId}/disconnect`, {
        method: 'POST'
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Disconnect failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckHealth = async (connectionId: string) => {
    try {
      setActionLoading(connectionId);
      const res = await fetch(`/api/v1/integrations/connections/${connectionId}/health`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setHealthStatus((prev) => ({
          ...prev,
          [connectionId]: data.data || { healthy: false }
        }));
      }
    } catch (err) {
      console.error('Health check failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getConnectionForProvider = (providerName: string) => {
    return connections.find((c) => c.provider === providerName);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'GOOGLE_CLASSROOM':
        return <GraduationCap className="w-6 h-6 text-amber-500" />;
      case 'GOOGLE_MEET':
        return <Video className="w-6 h-6 text-emerald-500" />;
      case 'ZOOM':
        return <Video className="w-6 h-6 text-blue-500" />;
      case 'MICROSOFT_TEAMS':
        return <Layers className="w-6 h-6 text-indigo-500" />;
      default:
        return <Plug className="w-6 h-6 text-red-500" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-text)] flex items-center gap-2">
            <Plug className="w-7 h-7 text-[#BE1E2E]" />
            External Integrations Hub
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Production-grade connections for Google Classroom, Google Meet, Zoom, and Microsoft Teams.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-lg text-sm font-medium hover:bg-[var(--brand-border)] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <nav aria-label="Breadcrumb" className="text-xs text-[var(--text-muted)] flex items-center gap-2">
        <Link href="/admin/organization" className="hover:text-[#BE1E2E]">Settings</Link><span>→</span><span className="font-semibold text-[var(--brand-text)]">Integrations</span>
      </nav>
      {feedback && <div role="alert" className={`rounded-xl border p-4 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-amber-500/30 bg-amber-500/10 text-amber-800'}`}>{feedback.message}</div>}

      {/* Providers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-[var(--bg-surface-elevated)] animate-pulse border border-[var(--brand-border)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((p) => {
            const conn = getConnectionForProvider(p.provider);
            const isConnected = conn && conn.status === 'CONNECTED';
            const isReauth = conn && ['REAUTH_REQUIRED', 'RECONNECT_REQUIRED', 'MISSING_SCOPE', 'EXPIRED'].includes(conn.status);
            const isError = conn && conn.status === 'ERROR';
            const health = conn ? healthStatus[conn.id] : null;
            const isTestMode = Boolean((conn as any)?.metadata?.isDemo);
            const setupRequired = p.configurationStatus === 'SETUP_REQUIRED';
            const reauthLabel = conn?.status === 'MISSING_SCOPE' ? 'Missing Scope'
              : conn?.status === 'RECONNECT_REQUIRED' ? 'Reconnect Required'
                : conn?.status === 'EXPIRED' ? 'Expired' : 'Reauth Required';

            return (
              <div
                key={p.provider}
                data-testid={`provider-card-${p.provider}`}
                className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-[#BE1E2E]/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--brand-border)]">
                        {getProviderIcon(p.provider)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--brand-text)]">{p.displayName}</h2>
                        {isTestMode && <span className="text-[10px] font-bold text-amber-700">TEST MODE</span>}
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                          {p.category}
                        </span>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    ) : isReauth ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {reauthLabel}
                      </span>
                    ) : isError ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--brand-border)]">
                        Disconnected
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[var(--text-muted)] mt-4">{p.description}</p>
                  <div className="mt-3 text-xs space-y-1 text-[var(--text-muted)]">
                    <div><span className="font-semibold text-[var(--brand-text)]">Authorization:</span> {p.requiredAuthorization || 'Authorized institute administrator'}</div>
                    <div><span className="font-semibold text-[var(--brand-text)]">Setup status:</span> {p.setupStatus || (setupRequired ? 'DEPLOYMENT_NOT_CONFIGURED' : 'READY_TO_CONNECT')}</div>
                    <div className={setupRequired ? 'text-amber-700' : 'text-emerald-600'}>{p.configurationMessage}</div>
                    {p.requiredScopes?.length ? (
                      <details className="pt-1">
                        <summary className="cursor-pointer font-semibold text-[var(--brand-text)]">Required permissions ({p.requiredScopes.length})</summary>
                        <ul className="mt-1 space-y-1 break-all" aria-label={`${p.displayName} required permissions`}>
                          {p.requiredScopes.map((scope) => <li key={scope}>• {scope}</li>)}
                        </ul>
                      </details>
                    ) : null}
                    {p.provider === 'ZOOM' && (
                      <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-1 text-[var(--brand-text)]">
                        <div className="font-semibold">Zoom OAuth deployment diagnostics</div>
                        <div>Deployment: <span className="font-mono">{p.setupStatus || 'UNKNOWN'}</span></div>
                        <div>OAuth callback: <span className="font-mono break-all">{p.callbackUrl || 'Set API_PUBLIC_URL to calculate this URL'}</span></div>
                        <div>Callback HTTPS: <span className={p.callbackUrl?.startsWith('https://') ? 'text-emerald-600' : 'text-amber-700'}>{p.callbackUrl?.startsWith('https://') ? 'Yes' : 'No — use a stable HTTPS API origin for Zoom'}</span></div>
                        <div className="text-[var(--text-muted)]">Copy this exact callback into Zoom Marketplace’s development OAuth redirect setting and equivalent OAuth allow-list setting. Configuration readiness does not mean a Zoom account is connected.</div>
                      </div>
                    )}
                    {setupRequired && (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 text-[var(--brand-text)]">
                        <div className="font-semibold">Deployment operator setup</div>
                        {p.missingConfiguration?.length ? <div>Missing variables: <span className="font-mono">{p.missingConfiguration.join(', ')}</span></div> : null}
                        {p.invalidConfiguration?.length ? <div>Invalid settings: <span className="font-mono">{p.invalidConfiguration.join(', ')}</span></div> : null}
                        <div>Callback URL: <span className="font-mono break-all">{p.callbackUrl || 'Set API_PUBLIC_URL to calculate this URL'}</span></div>
                        {p.webhookUrl ? <div>Webhook URL: <span className="font-mono break-all">{p.webhookUrl}</span></div> : null}
                        {p.setupGuideUrl ? <a className="inline-block font-semibold text-[#BE1E2E] underline" href={p.setupGuideUrl} target="_blank" rel="noreferrer">Open official setup guide</a> : null}
                        <div className="text-[var(--text-muted)]">Secrets must be configured on the API server and are never entered in this page.</div>
                      </div>
                    )}
                    {conn?.lastErrorMessage && <div className="text-red-600">{conn.lastErrorMessage}</div>}
                    {conn?.metadata?.missingScopes?.length ? <div className="text-amber-700">Missing capabilities: {conn.metadata.missingScopes.join(', ')}</div> : null}
                  </div>

                  {/* Capabilities tags */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {p.capabilities.supportsUpdate && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        • Update Meeting
                      </span>
                    )}
                    {p.capabilities.supportsCancel && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        • Cancel Sync
                      </span>
                    )}
                    {p.capabilities.supportsParticipants && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        • Attendance Evidence
                      </span>
                    )}
                    {p.capabilities.supportsRecordings && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        • Recordings
                      </span>
                    )}
                  </div>

                  {conn && (
                    <div className="mt-4 p-3 bg-[var(--bg-surface-elevated)] rounded-lg text-xs space-y-1 font-mono text-[var(--text-muted)]">
                      <div>Account: {String(conn.metadata?.accountEmail || conn.externalAccountId || 'Provider identity unavailable')}</div>
                      <div>Scope: {conn.scopeType}</div>
                      {conn.lastHealthCheckAt && (
                        <div>Last successful verification: {new Date(conn.lastHealthCheckAt).toLocaleString()}</div>
                      )}
                      <div>Last updated: {new Date(conn.updatedAt).toLocaleString()}</div>
                      {health && (
                        <div className={health.healthy ? 'text-emerald-500' : 'text-red-500'}>
                          Probe result: {health.healthy ? 'Active' : health.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-[var(--brand-border)] flex items-center justify-between gap-3">
                  {!canManage ? (
                    <div data-testid={`provider-readonly-${p.provider}`} className="w-full rounded-lg bg-[var(--bg-surface-elevated)] px-3 py-2 text-center text-xs text-[var(--text-muted)]">Read-only status · contact an integration administrator to make changes</div>
                  ) : isConnected ? (
                    <>
                      <button
                        onClick={() => handleCheckHealth(conn.id)}
                        disabled={actionLoading === conn.id}
                        className="px-3 py-1.5 rounded-lg border border-[var(--brand-border)] text-xs font-semibold hover:bg-[var(--bg-surface-elevated)] transition-colors"
                      >
                        Verify Connection
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        disabled={actionLoading === conn.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(p.provider)}
                      disabled={actionLoading === p.provider || setupRequired}
                      title={setupRequired ? p.configurationMessage : undefined}
                      className="w-full py-2 rounded-lg bg-[#BE1E2E] text-white text-xs font-bold shadow hover:bg-[#a61725] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === p.provider ? 'Opening authorization…' : setupRequired ? `Setup required for ${p.displayName}` : `${isReauth ? 'Reconnect' : 'Connect'} ${p.displayName}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
