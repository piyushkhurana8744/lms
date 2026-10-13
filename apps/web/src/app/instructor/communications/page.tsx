'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Send,
  Plus,
  ArrowRight,
  Sparkles,
  Inbox,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatTimeOnly } from '@edtech/utils';

export default function InstructorCommunicationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ANNOUNCEMENTS' | 'CONVERSATIONS'>('ANNOUNCEMENTS');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // 1. Fetch announcements
  const { data: annData, isLoading: annLoading } = useQuery({
    queryKey: ['instructor-announcements'],
    queryFn: async () => {
      const res = await fetch('/api/v1/communications/announcements');
      if (!res.ok) return { data: { announcements: [] } };
      return res.json();
    }
  });

  // 2. Fetch conversations
  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['instructor-conversations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/communications/conversations');
      if (!res.ok) return { data: { conversations: [] } };
      return res.json();
    }
  });

  // 3. Fetch active conversation messages
  const { data: msgData, isLoading: msgLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['instructor-messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return { data: { messages: [] } };
      const res = await fetch(`/api/v1/communications/conversations/${selectedConvId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json();
    },
    enabled: !!selectedConvId
  });

  const announcements = annData?.data?.announcements || [];
  const conversations = convData?.data?.conversations || [];
  const messages = msgData?.data?.messages || [];

  // 4. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !messageText.trim()) return;
      const res = await fetch(`/api/v1/communications/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageText.trim() })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessageText('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['instructor-conversations'] });
    }
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--brand-text)]">Faculty Communication Hub</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Broadcast announcements to your assigned batches and respond to student inquiries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ANNOUNCEMENTS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            Announcements ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab('CONVERSATIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CONVERSATIONS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            Student Messages ({conversations.length})
          </button>
        </div>
      </div>

      {activeTab === 'ANNOUNCEMENTS' ? (
        <div className="space-y-4">
          {annLoading ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-2">
              <Megaphone className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--brand-text)]">No Announcements</h3>
              <p className="text-xs text-[var(--text-muted)]">No broadcast announcements published in your scope.</p>
            </div>
          ) : (
            announcements.map((item: any) => (
              <div
                key={item._id || item.id}
                className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400">
                      {item.status}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      Audience: {item.audience?.selector || 'BATCH'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    {item.publishedAt ? formatDate(item.publishedAt) : ''}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[var(--brand-text)]">{item.title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.body}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px]">
          {/* Thread List */}
          <div className="md:col-span-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-[var(--brand-border)] font-bold text-xs uppercase tracking-wider text-[var(--brand-text)]">
              Student Threads
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--brand-border)] custom-scrollbar">
              {convLoading ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">Loading threads...</div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">No conversations.</div>
              ) : (
                conversations.map((conv: any) => {
                  const convId = conv._id || conv.id;
                  const isSelected = selectedConvId === convId;
                  return (
                    <button
                      key={convId}
                      onClick={() => setSelectedConvId(convId)}
                      className={`w-full p-3.5 text-left transition-colors ${
                        isSelected ? 'bg-blue-600/10 border-l-4 border-l-blue-600' : 'hover:bg-[var(--bg-surface-elevated)]'
                      }`}
                    >
                      <p className="text-xs font-bold text-[var(--brand-text)] truncate">{conv.subject || 'Student Query'}</p>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{conv.lastMessage.body}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="md:col-span-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col overflow-hidden">
            {selectedConvId ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                  {msgLoading ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)]">Loading messages...</div>
                  ) : (
                    messages.map((msg: any) => (
                      <div
                        key={msg._id || msg.id}
                        className="p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1 max-w-[80%]"
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-[var(--text-muted)]">
                          <span>Sender: {msg.senderUserId}</span>
                          <span>{formatTimeOnly(msg.sentAt || msg.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[var(--brand-text)] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-[var(--brand-border)] flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Reply to student..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMutation.mutate();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    disabled={!messageText.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate()}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
                <p className="text-xs text-[var(--text-muted)]">Select a student message thread to view and reply.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
