"use client";

import * as React from "react";

export type ClientRealtimeEvent =
  | { type: "message:new"; conversationId: string; messageId: string; senderId: string }
  | { type: "message:read"; conversationId: string; readerId: string; readAt: string }
  | { type: "typing"; conversationId: string; userId: string; isTyping: boolean }
  | { type: "notification:new"; notificationId: string }
  | { type: "ping" };

type Handler = (event: ClientRealtimeEvent) => void;

interface RealtimeContextValue {
  subscribe: (handler: Handler) => () => void;
  connected: boolean;
}

const RealtimeContext = React.createContext<RealtimeContextValue>({ subscribe: () => () => {}, connected: false });

// Keeps a single EventSource per tab for the signed-in user and fans events out to subscribers.
export function RealtimeProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const handlers = React.useRef(new Set<Handler>());
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) return;
    const source = new EventSource("/api/realtime");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as ClientRealtimeEvent;
        if (event.type === "ping") return;
        for (const handler of handlers.current) handler(event);
      } catch {
        // ignore malformed events
      }
    };
    return () => {
      source.close();
      setConnected(false);
    };
  }, [enabled]);

  const subscribe = React.useCallback((handler: Handler) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  const value = React.useMemo(() => ({ subscribe, connected }), [subscribe, connected]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(handler: Handler, deps: React.DependencyList = []) {
  const { subscribe, connected } = React.useContext(RealtimeContext);
  const stable = React.useRef(handler);
  React.useEffect(() => {
    stable.current = handler;
  });
  React.useEffect(() => subscribe((event) => stable.current(event)), [subscribe, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { connected };
}
