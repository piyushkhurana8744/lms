'use client';

import { useEffect, useState } from 'react';
import { Video, PlayCircle, Clock3, AlertCircle } from 'lucide-react';

export default function StudentRecordingsPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/v1/integrations/recordings')
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load recordings'); return body; })
      .then((body) => setItems(body.data || []))
      .catch((reason) => setError(reason.message));
  }, []);
  return <div className="space-y-6 max-w-5xl mx-auto">
    <div><h1 className="text-3xl font-black flex items-center gap-2"><Video className="h-7 w-7 text-[#BE1E2E]"/>Recorded classes</h1><p className="text-sm text-[var(--text-muted)] mt-1">Recordings appear after Zoom finishes cloud processing. Availability is not immediate when a class ends.</p></div>
    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 flex gap-2"><AlertCircle className="h-5 w-5"/>{error}</div>}
    {!items && !error ? <p>Loading recordings…</p> : items?.length === 0 ? <div className="rounded-2xl border p-8 text-center text-[var(--text-muted)]">No recorded classes are available yet.</div> : <div className="grid gap-4">{items?.map((item) => <article key={item.id} className="rounded-2xl border bg-[var(--bg-surface)] p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"><div><h2 className="font-bold text-lg">{item.classTitle}</h2><p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{item.sessionDate ? new Date(item.sessionDate).toLocaleString() : 'Session date unavailable'}</p></div><span className="text-xs font-bold rounded-full px-3 py-1 bg-slate-100 text-slate-700">{String(item.state).replaceAll('_', ' ')}</span></div>
      <div className="flex flex-wrap gap-2">{item.files?.filter((file:any) => file.playable).map((file:any) => <a key={file.id} href={`/api/v1/integrations/recordings/${item.id}/files/${file.id}/play`} className="inline-flex items-center gap-2 rounded-xl bg-[#BE1E2E] text-white px-4 py-2 text-sm font-bold"><PlayCircle className="h-4 w-4"/>Play {file.fileType}</a>)}</div>
    </article>)}</div>}
  </div>;
}
