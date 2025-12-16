// app/chat/page.tsx
'use client';

import Navbar from '@/components/Navbar';
import Chatbox from '@/components/Chatbox';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, ApiHistoryPart } from '@/store/chartStore'; //  App Store
import type { ChatApiResponse, StockHistoryPoint, StockPredictionPoint } from '@/types/chat';

// Define the type of the user object
interface User {
  name: string;
  email: string;
}

export default function ChatPage() {
  const LAST_CONV_KEY = 'lastConversationId';
  const [user, setUser] = useState<User | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt?: string; lastMessage?: { role: string; content: string } | null }>>([]);
  const [loadedHistory, setLoadedHistory] = useState<ApiHistoryPart[] | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  // App Store for chart data
  const { setChartData } = useAppStore();

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const refreshConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error('Failed to refresh the session list', e);
    }
  };

  const hasRunningMonitors = async (convId: string, token: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/monitor/status?conversationId=${encodeURIComponent(convId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      const tasks = (data?.tasks || []) as Array<{ status?: string }>;
      return tasks.some((t) => t.status === 'running');
    } catch (e) {
      return false;
    }
  };

  // Load the user information and session list
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
    // Load the session list
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);

          // Automatically resume the last session
          const lastId = localStorage.getItem(LAST_CONV_KEY);
          if (lastId) {
            try {
              await handleLoadConversation(lastId);
            } catch (e) {
              // If loading fails, clear the last session ID
              localStorage.removeItem(LAST_CONV_KEY);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load the session list', e);
      }
    };
    fetchConversations();
  }, [router]);

  // define a handler for API responses from Chatbox
  const handleApiResponse = (data: ChatApiResponse) => {
    // reset chart data if no function call result
    if (!data.functionCallResult) return;

    const result = data.functionCallResult;
    const functionName = result.name;

    // Handle different function call results
    if (functionName === 'get_stock_history') {
      const ticker = result.data.symbol || "stock";
      const formattedData = (result.data.history || []).map((h: StockHistoryPoint) => ({
        date: h.date,
        price: h.price,
      }));

      setChartData({
        ticker: ticker,
        data: formattedData,
      });
    }
    // deal with stock price prediction results
    else if (functionName === 'predict_stock_price') {
      const ticker = result.data.symbol || "stock";

      
      const historicalData = (result.data.history || []).map((h: StockHistoryPoint) => ({
        date: h.date,
        price: h.price,
      })) || [];

      const predictionData = (result.data.predictions || []).map((p: StockPredictionPoint) => ({
        date: p.date,
        predictedPrice: p.predictedPrice,
      }));

      // Combine historical and prediction data
      const combinedData = [...historicalData, ...predictionData];

      setChartData({
        ticker: ticker,
        data: combinedData,
      });
    }
  };

  const defaultWelcome = useMemo<ApiHistoryPart[]>(
    () => [{ role: 'model', parts: [{ text: 'Hello! Im your financial assistant. May I ask how I can assist you?' }] }],
    []
  );

  const handleLoadConversation = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      // stop monitors for previous conversation
      if (conversationId && conversationId !== id) {
        try {
          const hadRunning = await hasRunningMonitors(conversationId, token || '');
          await fetch('/api/monitor/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ conversationId }),
          });
          if (hadRunning) showToast('The monitoring of the previous session has been stopped');
        } catch (e) {
          console.warn('The monitoring to stop the previous session failed (ignored)', e);
        }
      }
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Session loading failed');
      const data = await res.json();
      setConversationId(data.id);
      setLoadedHistory(data.history);
      localStorage.setItem(LAST_CONV_KEY, data.id);
    } catch (e) {
      console.error(e);
      }
  };

  const handleNewChat = async () => {
    try {
      const token = localStorage.getItem('token');
      if (conversationId && token) {
        const hadRunning = await hasRunningMonitors(conversationId, token);
        await fetch('/api/monitor/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId }),
        }).catch(() => {});
        if (hadRunning) showToast('The monitoring of the previous session has been stopped');
      }
    } catch (e) {
      // ignore stop errors
    }
    try {
      // Create a new conversation via the backend
      const token = localStorage.getItem('token');
      if (!token) {
        // if no token, fallback to local new chat
        setConversationId(null);
        setLoadedHistory(defaultWelcome);
        localStorage.removeItem(LAST_CONV_KEY);
        return;
      }
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'new session' }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setLoadedHistory(defaultWelcome);
        localStorage.setItem(LAST_CONV_KEY, data.id);
        await refreshConversations();
      } else {
        // creation failed, fallback to local new chat
        setConversationId(null);
        setLoadedHistory(defaultWelcome);
        localStorage.removeItem(LAST_CONV_KEY);
        await refreshConversations();
      }
    } catch (e) {
      // on error, fallback to local new chat
      setConversationId(null);
      setLoadedHistory(defaultWelcome);
      localStorage.removeItem(LAST_CONV_KEY);
    }
  };

  // delete conversation handler
  const handleDeleteConversation = async (id: string) => {
    const confirmed = window.confirm('Confirm the deletion of this session? This operation cannot be restored.');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      let hadRunning = false;
      if (id === conversationId && token) {
        hadRunning = await hasRunningMonitors(id, token);
      }
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to delete the session');
      }

      // delete from local list
      setConversations((prev) => prev.filter((c) => c.id !== id));

      // if deleting the current conversation, reset
      if (conversationId === id) {
        if (hadRunning) showToast('The monitoring of the previous session has been stopped');
        setConversationId(null);
        setLoadedHistory(defaultWelcome);
        localStorage.removeItem(LAST_CONV_KEY);
      }
      // refresh list
      await refreshConversations();
    } catch (e) {
      console.error(e);
      alert('Deletion failed. Please try again later.');
    }
  };

  // Loading state while user info is being fetched
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">loading...</p>
      </div>
    );
  }

  // Main chat page UI
  return (
    <main className="bg-white">
      <Navbar />
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-3">
            <span className="text-sm">{toast}</span>
            <button
              className="text-white/80 hover:text-white text-sm"
              onClick={() => setToast(null)}
              aria-label="bell close"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <section className="bg-blue-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-4xl font-bold">welcome back, {user.name}!</h1>
              <p className="mt-2 text-lg text-blue-200">Are you ready to embark on your journey of intelligent trading?</p>
          </div>
      </section>

      <section className="bg-gray-100 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Talk to your AI assistant</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <aside className="md:col-span-1 bg-white rounded-lg shadow p-4 h-[70vh] overflow-y-auto overflow-x-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">session history</h3>
                <button onClick={handleNewChat} className="text-sm text-blue-600 hover:text-blue-700">New session</button>
              </div>
              <ul className="space-y-2">
                {conversations.length === 0 && (
                  <li className="text-gray-500 text-sm">No conversation for now</li>
                )}
                {conversations.map((c) => (
                  <li key={c.id}>
                    <div className={`flex items-center gap-2 px-2 py-2 rounded min-w-0 ${conversationId === c.id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>
                      <button
                        onClick={() => handleLoadConversation(c.id)}
                        className="flex-1 min-w-0 text-left"
                        title={c.title}
                      >
                        <div className="text-sm font-medium text-gray-800 truncate max-w-full">{c.title}</div>
                        {c.lastMessage?.content && (
                          <div className="text-xs text-gray-500 truncate max-w-full">{c.lastMessage.content}</div>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(c.id);
                        }}
                        className="shrink-0 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded"
                        aria-label="Delete Session Request"
                        title="Delete Session Request"
                      >
                        delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>

            <div className="md:col-span-2">
              <Chatbox
                onApiResponse={handleApiResponse}
                conversationId={conversationId}
                initialHistory={loadedHistory || defaultWelcome}
                onConversationCreated={(id) => {
                  setConversationId(id);
                  localStorage.setItem(LAST_CONV_KEY, id);
                  // refresh list
                  (async () => {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                      const data = await res.json();
                      setConversations(data.conversations || []);
                    }
                  })();
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto text-center">
            <p>&copy; 2025 MyFinAI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
