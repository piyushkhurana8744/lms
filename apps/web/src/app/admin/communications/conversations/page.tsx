'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  MessageSquare,
  ArrowLeft,
  Search,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { formatTimeOnly } from '@edtech/utils';

export default function AdminConversationsPage() {
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // 1. Fetch conversations
  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/communications/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      return res.json();
    }
  });

  const conversations = convsData?.data?.conversations || [];

  // 2. Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['admin-messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return { data: { messages: [] } };
      const res = await fetch(`/api/v1/communications/conversations/${selectedConvId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json();
    },
    enabled: !!selectedConvId
  });

  const messages = messagesData?.data?.messages || [];
  const activeConversation = conversations.find((c: any) => (c._id || c.id) === selectedConvId);

  // 3. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !messageText.trim()) return;
      const res = await fetch(`/api/v1/communications/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: messageText.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessageText('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
    }
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/communications"
            className="p-2 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--brand-text)]" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-[var(--brand-text)]">Institutional Conversations</h1>
            <p className="text-xs text-[var(--text-muted)]">Manage authorized student support and staff message threads</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[650px]">
        {/* Left Col: Conversations List */}
        <div className="md:col-span-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--brand-border)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-text)] mb-2">
              Thread Directory
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--brand-border)] custom-scrollbar">
            {convsLoading ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">No active conversations found.</div>
            ) : (
              conversations.map((conv: any) => {
                const convId = conv._id || conv.id;
                const isSelected = selectedConvId === convId;
                return (
                  <button
                    key={convId}
                    onClick={() => setSelectedConvId(convId)}
                    className={`w-full p-4 text-left transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#BE1E2E]/10 border-l-4 border-l-[#BE1E2E]'
                        : 'hover:bg-[var(--bg-surface-elevated)]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-blue-500/10 text-blue-400">
                          {conv.type}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[var(--brand-text)] truncate">
                        {conv.subject || `Conversation #${convId.slice(-4)}`}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {conv.lastMessage.body}
                        </p>
                      )}
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-[#BE1E2E] flex-shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Cols: Message View & Composer */}
        <div className="md:col-span-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col overflow-hidden">
          {selectedConvId ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[var(--brand-border)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--brand-text)]">
                    {activeConversation?.subject || `Thread #${selectedConvId.slice(-6)}`}
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Type: {activeConversation?.type} | Participants: {activeConversation?.participants?.length ?? 2}
                  </span>
                </div>
              </div>

              {/* Messages History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {messagesLoading ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                    No messages yet in this conversation.
                  </div>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg._id || msg.id}
                      className="p-3.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1 max-w-[80%]"
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-[var(--text-muted)]">
                        <span className="font-bold text-[var(--brand-text)]">User: {msg.senderUserId}</span>
                        <span>{formatTimeOnly(msg.sentAt || msg.createdAt)}</span>
                      </div>
                      <p className="text-xs text-[var(--brand-text)] leading-relaxed whitespace-pre-wrap">
                        {msg.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-[var(--brand-border)] bg-[var(--brand-background)] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMutation.mutate();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                />
                <button
                  type="button"
                  disabled={!messageText.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                  className="px-4 py-2 rounded-xl bg-[#BE1E2E] text-white text-xs font-bold hover:bg-[#a01825] disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-[var(--text-muted)] stroke-1" />
              <h3 className="text-sm font-bold text-[var(--brand-text)]">No conversation selected</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Select a conversation thread from the left directory to view communication history and reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
