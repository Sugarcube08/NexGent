import { useEffect, useState, useRef } from 'react';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws') + '/ws/telemetry';

export interface TelemetryMessage {
  channel: string;
  data: any;
}

export const useTelemetry = () => {
  const [lastMessage, setLastMessage] = useState<TelemetryMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('[Telemetry] Connected to Neural Stream');
      };

      ws.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastMessage(payload);
        } catch (err) {
          console.error('[Telemetry] Failed to parse message', err);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        console.log('[Telemetry] Disconnected. Reconnecting in 3s...');
        // Auto-reconnect
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (err) => {
        console.error('[Telemetry] WebSocket error', err);
        ws.current?.close();
      };
    } catch (e) {
      console.error('[Telemetry] Connection failed', e);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect loop on unmount
        ws.current.close();
      }
    };
  }, []);

  return { lastMessage, isConnected };
};
