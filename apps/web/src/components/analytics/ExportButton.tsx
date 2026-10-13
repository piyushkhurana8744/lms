'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  reportKey: string;
  query?: Record<string, any>;
  label?: string;
}

export function ExportButton({ reportKey, query = {}, label = 'Export CSV' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/analytics/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportKey,
          format: 'CSV',
          query,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Export failed');
      }

      const data = await res.json();
      const exportItem = data.data;

      if (exportItem?.artifact?.content) {
        // Direct browser file download
        const blob = new Blob([exportItem.artifact.content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', exportItem.artifact.filename || `${reportKey}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      alert(err.message || 'Unable to download export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-accent disabled:opacity-50"
      title="Download CSV report"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}
