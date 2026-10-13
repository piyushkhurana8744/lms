import React, { useState, useEffect } from 'react';
import { StorageProvider } from '@edtech/types';
import { Button } from '@edtech/ui';
import { Cloud, HardDrive, Image as ImageIcon, Eye, EyeOff, X, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Save, Loader2, Server } from 'lucide-react';

export interface StorageProviderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onTestConnection: (payload: any) => Promise<boolean>;
  onSaveConfiguration: (payload: any) => Promise<void>;
  isTestPending?: boolean;
  isSavePending?: boolean;
}

export function StorageProviderDialog({
  isOpen,
  onClose,
  initialData,
  onTestConnection,
  onSaveConfiguration,
  isTestPending = false,
  isSavePending = false
}: StorageProviderDialogProps) {
  const [platform, setPlatform] = useState<'LMS' | 'CLOUDINARY'>('LMS');
  const [selectedProvider, setSelectedProvider] = useState<StorageProvider>('CLOUDFLARE_R2');

  // Form state
  const [r2, setR2] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    publicBaseUrl: ''
  });

  const [s3, setS3] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucket: '',
    endpoint: '',
    publicBaseUrl: ''
  });

  const [cloudinary, setCloudinary] = useState({
    cloudName: '',
    apiKey: '',
    apiSecret: '',
    folderPrefix: ''
  });

  // Secret Visibility Toggles
  const [showR2Secret, setShowR2Secret] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.provider) {
        setSelectedProvider(initialData.provider);
        if (initialData.provider === 'CLOUDINARY') {
          setPlatform('CLOUDINARY');
        } else {
          setPlatform('LMS');
        }
      }
      if (initialData.r2) {
        setR2((prev) => ({
          ...prev,
          accountId: initialData.r2.accountId || '',
          bucket: initialData.r2.bucket || '',
          publicBaseUrl: initialData.r2.publicBaseUrl || ''
        }));
      }
      if (initialData.s3) {
        setS3((prev) => ({
          ...prev,
          bucket: initialData.s3.bucket || '',
          region: initialData.s3.region || 'us-east-1',
          endpoint: initialData.s3.endpoint || '',
          publicBaseUrl: initialData.s3.publicBaseUrl || ''
        }));
      }
      if (initialData.cloudinary) {
        setCloudinary((prev) => ({
          ...prev,
          cloudName: initialData.cloudinary.cloudName || '',
          apiKey: initialData.cloudinary.apiKey || '',
          folderPrefix: initialData.cloudinary.folderPrefix || ''
        }));
      }
    }
  }, [initialData]);

  if (!isOpen) return null;

  const activeProvider = platform === 'CLOUDINARY' ? 'CLOUDINARY' : selectedProvider;

  const buildPayload = () => {
    const payload: any = { provider: activeProvider, isEnabled: true };
    if (activeProvider === 'CLOUDFLARE_R2') {
      payload.r2 = { ...r2 };
    } else if (activeProvider === 'AMAZON_S3' || activeProvider === 'AWS_S3') {
      payload.s3 = { ...s3 };
    } else if (activeProvider === 'CLOUDINARY') {
      payload.cloudinary = { ...cloudinary };
    }
    return payload;
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const payload = buildPayload();
      const success = await onTestConnection(payload);
      setTestResult({
        success,
        message: success ? 'Connection verified successfully!' : 'Connection test failed'
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed'
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    await onSaveConfiguration(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh] text-[var(--brand-text)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base">Configure Organization Storage Provider</h3>
          </div>

          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--brand-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Cards */}
        <div className="space-y-3 text-xs">
          <label className="font-bold text-[var(--brand-text)] block">Media Platform *</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPlatform('LMS');
                setSelectedProvider('CLOUDFLARE_R2');
              }}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                platform === 'LMS'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] font-bold'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--brand-text)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span>LMS Native Storage</span>
              </div>
              {platform === 'LMS' && <CheckCircle2 className="w-4 h-4 text-[#BE1E2E]" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform('CLOUDINARY');
                setSelectedProvider('CLOUDINARY');
              }}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                platform === 'CLOUDINARY'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] font-bold'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--brand-text)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span>Cloudinary Platform</span>
              </div>
              {platform === 'CLOUDINARY' && <CheckCircle2 className="w-4 h-4 text-[#BE1E2E]" />}
            </button>
          </div>
        </div>

        {/* LMS Sub-Drivers Selector */}
        {platform === 'LMS' && (
          <div className="space-y-2 text-xs pt-1 border-t border-[var(--brand-border)]">
            <label className="font-bold text-[var(--brand-text)] block">LMS Driver Engine</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedProvider('CLOUDFLARE_R2')}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all text-xs ${
                  selectedProvider === 'CLOUDFLARE_R2'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Cloudflare R2
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider('AMAZON_S3')}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all text-xs ${
                  selectedProvider === 'AMAZON_S3' || selectedProvider === 'AWS_S3'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Amazon S3
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider('LOCAL')}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all text-xs ${
                  selectedProvider === 'LOCAL'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Local Dev Disk
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Cloudflare R2 Form */}
          {selectedProvider === 'CLOUDFLARE_R2' && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
              <h4 className="font-bold text-xs text-[var(--brand-text)]">Cloudflare R2 Configuration</h4>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. 8f92a10b42c14902b781..."
                  value={r2.accountId}
                  onChange={(e) => setR2({ ...r2, accountId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Bucket Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. didm-lms-production"
                  value={r2.bucket}
                  onChange={(e) => setR2({ ...r2, bucket: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Access Key ID</label>
                <input
                  type="text"
                  placeholder="e.g. R2_ACCESS_KEY_ID"
                  value={r2.accessKeyId}
                  onChange={(e) => setR2({ ...r2, accessKeyId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Secret Access Key</label>
                <div className="relative">
                  <input
                    type={showR2Secret ? 'text' : 'password'}
                    placeholder="••••••••••••••••"
                    value={r2.secretAccessKey}
                    onChange={(e) => setR2({ ...r2, secretAccessKey: e.target.value })}
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs select-none"
                    onCopy={(e) => e.preventDefault()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowR2Secret(!showR2Secret)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                  >
                    {showR2Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Public Custom Domain / CDN Base URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://cdn.yourdomain.com"
                  value={r2.publicBaseUrl}
                  onChange={(e) => setR2({ ...r2, publicBaseUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Amazon S3 Form */}
          {(selectedProvider === 'AMAZON_S3' || selectedProvider === 'AWS_S3') && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
              <h4 className="font-bold text-xs text-[var(--brand-text)]">Amazon S3 Bucket Configuration</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">Bucket Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. my-s3-bucket"
                    value={s3.bucket}
                    onChange={(e) => setS3({ ...s3, bucket: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--brand-text)]">AWS Region</label>
                  <input
                    type="text"
                    placeholder="e.g. us-east-1"
                    value={s3.region}
                    onChange={(e) => setS3({ ...s3, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Access Key ID</label>
                <input
                  type="text"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={s3.accessKeyId}
                  onChange={(e) => setS3({ ...s3, accessKeyId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Secret Access Key</label>
                <div className="relative">
                  <input
                    type={showS3Secret ? 'text' : 'password'}
                    placeholder="••••••••••••••••"
                    value={s3.secretAccessKey}
                    onChange={(e) => setS3({ ...s3, secretAccessKey: e.target.value })}
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs select-none"
                    onCopy={(e) => e.preventDefault()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowS3Secret(!showS3Secret)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                  >
                    {showS3Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">S3 Endpoint URL (Optional for MinIO / S3 Compat)</label>
                <input
                  type="text"
                  placeholder="https://s3.us-east-1.amazonaws.com"
                  value={s3.endpoint}
                  onChange={(e) => setS3({ ...s3, endpoint: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Cloudinary Form */}
          {selectedProvider === 'CLOUDINARY' && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
              <h4 className="font-bold text-xs text-[var(--brand-text)]">Cloudinary Media Store Configuration</h4>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Cloud Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. didm-cloud"
                  value={cloudinary.cloudName}
                  onChange={(e) => setCloudinary({ ...cloudinary, cloudName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">API Key</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012345"
                  value={cloudinary.apiKey}
                  onChange={(e) => setCloudinary({ ...cloudinary, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">API Secret</label>
                <div className="relative">
                  <input
                    type={showCloudinarySecret ? 'text' : 'password'}
                    placeholder="••••••••••••••••"
                    value={cloudinary.apiSecret}
                    onChange={(e) => setCloudinary({ ...cloudinary, apiSecret: e.target.value })}
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs select-none"
                    onCopy={(e) => e.preventDefault()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                  >
                    {showCloudinarySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--brand-text)]">Folder Prefix (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. courses/media"
                  value={cloudinary.folderPrefix}
                  onChange={(e) => setCloudinary({ ...cloudinary, folderPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Local Development Warning */}
          {selectedProvider === 'LOCAL' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Development Local Storage Selected</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Local disk storage saves media files directly to the local server disk. Local storage is strictly restricted in production environments unless explicitly enabled via <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">ALLOW_LOCAL_STORAGE=true</code>.
              </p>
            </div>
          )}

          {/* Connection Test Result Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between gap-3">
            {selectedProvider !== 'LOCAL' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTestPending || isSavePending}
                className="flex items-center gap-1.5"
              >
                {isTestPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> Test Connection
                  </>
                )}
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSavePending}>
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isTestPending || isSavePending}
                className="flex items-center gap-1.5 bg-[#BE1E2E] hover:bg-[#a01826] text-white"
              >
                {isSavePending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
