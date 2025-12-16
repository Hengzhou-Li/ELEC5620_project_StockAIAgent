// components/StopMonitorOnUnload.tsx
'use client';

import { useEffect } from 'react';

export default function StopMonitorOnUnload() {
  useEffect(() => {
    const handler = () => {
      try {
        const token = localStorage.getItem('token');
        const conversationId = localStorage.getItem('lastConversationId');
        if (!token || !conversationId) return;
        const body = JSON.stringify({ conversationId });
        fetch('/api/monitor/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    // Stop monitors when the page is being closed or unloaded.
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, []);

  return null;
}

