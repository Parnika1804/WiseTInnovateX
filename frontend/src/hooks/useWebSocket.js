import { useState, useEffect, useRef } from 'react';

// Singleton caches to prevent duplicate connections
const wsCache = {};
const subscribers = {};
const retryCounts = {};

export const useWebSocket = (channel, onMessage) => {
  const [status, setStatus] = useState('connecting');
  const savedCallback = useRef(onMessage);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!subscribers[channel]) {
      subscribers[channel] = new Set();
    }

    const messageHandler = (data) => {
      if (savedCallback.current) savedCallback.current(data);
    };

    subscribers[channel].add(messageHandler);

    const connect = () => {
      if (!wsCache[channel] || wsCache[channel].readyState === WebSocket.CLOSED) {
        const ws = new WebSocket(`wss://wisetinnovatex-r4vx.onrender.com/ws/${channel}`);
        wsCache[channel] = ws;
        retryCounts[channel] = retryCounts[channel] || 0;

        ws.onopen = () => {
          setStatus('open');
          retryCounts[channel] = 0; // Reset retries on successful connection
          window.dispatchEvent(new CustomEvent(`ws_status_${channel}`, { detail: 'open' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            subscribers[channel].forEach(cb => cb(data));
          } catch (e) {
            console.error('WS parse error', e);
          }
        };

        ws.onclose = () => {
          setStatus('closed');
          window.dispatchEvent(new CustomEvent(`ws_status_${channel}`, { detail: 'closed' }));
          
          if (retryCounts[channel] < 5) {
            retryCounts[channel]++;
            setTimeout(connect, 3000);
          }
        };
      } else {
        // If already connected/connecting, sync local state
        setStatus(wsCache[channel].readyState === WebSocket.OPEN ? 'open' : 'connecting');
      }
    };

    connect();

    // Listen to global status changes from the shared connection
    const handleStatusChange = (e) => setStatus(e.detail);
    window.addEventListener(`ws_status_${channel}`, handleStatusChange);

    return () => {
      subscribers[channel].delete(messageHandler);
      window.removeEventListener(`ws_status_${channel}`, handleStatusChange);
      
      // Clean up the actual WebSocket if this was the last subscriber
      if (subscribers[channel].size === 0 && wsCache[channel]) {
        wsCache[channel].close();
        delete wsCache[channel];
      }
    };
  }, [channel]);

  return status;
};