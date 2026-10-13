'use client';

import React, { useEffect, useState } from 'react';
import { Video, Loader2, AlertCircle } from 'lucide-react';
import { IJoinInformationDTO } from '@edtech/types';

interface LiveClassJoinButtonProps {
  classId: string;
  className?: string;
  disabled?: boolean;
}

export function LiveClassJoinButton({
  classId,
  className = '',
  disabled = false
}: LiveClassJoinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinInfo, setJoinInfo] = useState<IJoinInformationDTO | null>(null);

  useEffect(() => {
    fetch(`/api/v1/integrations/classes/${classId}/join`)
      .then(async (res) => res.ok ? setJoinInfo((await res.json()).data) : undefined)
      .catch(() => undefined);
  }, [classId]);

  const handleJoin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/integrations/classes/${classId}/join`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to authorize live class session');
      }

      const data = await res.json();
      const joinInfo: IJoinInformationDTO = data.data;
      setJoinInfo(joinInfo);

      const targetUrl = joinInfo.isHost && joinInfo.startUrl ? joinInfo.startUrl : joinInfo.joinUrl;

      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No live join URL available');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {joinInfo && <span data-testid="student-meeting-provider" className="text-[11px] font-semibold text-white/90">{joinInfo.provider.replaceAll('_', ' ')} · {joinInfo.status}</span>}
      <button
        onClick={handleJoin}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#BE1E2E] text-white text-sm font-bold shadow-md hover:bg-[#a61725] transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Video className="w-4 h-4" />
            <span>Join Live Class</span>
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </span>
      )}
    </div>
  );
}
