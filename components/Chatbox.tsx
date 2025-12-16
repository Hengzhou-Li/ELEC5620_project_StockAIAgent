// components/Chatbox.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import ChatInput from './ChatInput';
import ChatMessages from './ChatMessages';
import type { ApiHistoryPart } from '@/store/chartStore';
import type { ChatApiResponse } from '@/types/chat';

interface ChatboxProps {
  onApiResponse: (data: ChatApiResponse) => void;
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
  initialHistory?: ApiHistoryPart[];
}

export default function Chatbox({ onApiResponse, conversationId, onConversationCreated, initialHistory }: ChatboxProps) {
  const defaultWelcome = useMemo<ApiHistoryPart[]>(
    () => [{ role: 'model', parts: [{ text: 'Hello! Im your financial assistant. May I ask how I can assist you?' }] }],
    []
  );

  const [history, setHistory] = useState<ApiHistoryPart[]>(initialHistory && initialHistory.length > 0 ? initialHistory : defaultWelcome);
  const [isLoading, setIsLoading] = useState(false);

  // deduplicate adjacent messages with same role and content
  const dedupeAdjacent = (arr: ApiHistoryPart[]) => {
    const out: ApiHistoryPart[] = [];
    for (const m of arr) {
      const prev = out[out.length - 1];
      if (prev && prev.role === m.role && prev.parts?.[0]?.text === m.parts?.[0]?.text) continue;
      out.push(m);
    }
    return out;
  };

  // deduplicate repeated tail message pairs
  const dedupeTailPairs = (arr: ApiHistoryPart[]) => {
    const out = [...arr];
    while (out.length >= 4) {
      const n = out.length;
      const a = out[n - 4];
      const b = out[n - 3];
      const c = out[n - 2];
      const d = out[n - 1];
      const samePair =
        a.role === c.role && b.role === d.role &&
        a.parts?.[0]?.text === c.parts?.[0]?.text &&
        b.parts?.[0]?.text === d.parts?.[0]?.text;
      if (samePair) {
        out.splice(n - 2, 2);
      } else {
        break;
      }
    }
    return out;
  };

  const sanitizeHistory = (arr: ApiHistoryPart[]) => {
    const filtered = (arr || [])
      .filter((m) => m && (m.role === 'user' || m.role === 'model') && m.parts && typeof m.parts[0]?.text === 'string')
      // Remove messages with empty text (except for user messages)
      .filter((m) => m.role === 'user' || (m.parts[0].text || '').trim().length > 0)
      .map((m) => ({ role: m.role, parts: [{ text: String(m.parts[0].text || '') }] }));
    return dedupeTailPairs(dedupeAdjacent(filtered));
  };

  // If initialHistory changes because user switched conversations, update local history
  useEffect(() => {
    if (initialHistory && initialHistory.length > 0) {
      setHistory(sanitizeHistory(initialHistory));
    } else {
      setHistory(defaultWelcome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHistory]);

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    const historyForApi = [...history];
    const convAtSend = conversationId || undefined;

    const userMessage: ApiHistoryPart = { role: 'user', parts: [{ text: input }] };
    setHistory((prevHistory) => [...prevHistory, userMessage]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: input,
          history: historyForApi,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      onApiResponse(data);

      if (data.conversationId && !conversationId && onConversationCreated) {
        onConversationCreated(data.conversationId);
      }

      const nextHistory: ApiHistoryPart[] = Array.isArray(data.history) ? sanitizeHistory(data.history) : history;
      // Only update local history if still on the same conversation
      // or if this request created a new conversation
      const respConvId: string | undefined = data.conversationId || convAtSend;
      const stillOnSameConversation = (!conversationId && !respConvId) || (conversationId === respConvId);
      const createdByThisRequest = !convAtSend && !!data.conversationId;
      if (stillOnSameConversation || createdByThisRequest) {
        setHistory(nextHistory);
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: ApiHistoryPart = {
        role: 'model',
        parts: [{ text: 'Sorry, there was a little problem. Please try again later.' }],
      };
      setHistory((prevHistory) => [...prevHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] w-full max-w-4xl mx-auto bg-white rounded-lg shadow-2xl">
      <header className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h1 className="text-xl font-bold text-center text-gray-800">AI Financial Assistant</h1>
      </header>
      <ChatMessages history={history} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
