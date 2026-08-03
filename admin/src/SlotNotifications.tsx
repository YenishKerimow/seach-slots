import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface SlotFound {
  id: string;
  type: string;
  typeLabel: string;
  date: string;
  remaining: number;
  url: string;
}

interface Toast extends SlotFound {
  key: number;
}

/** Derive the Socket.IO server origin from the GraphQL endpoint (or VITE_WS_URL). */
function wsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return explicit;
  const gql =
    (import.meta.env.VITE_GRAPHQL_URL as string | undefined) ??
    'http://localhost:3000/graphql';
  return gql.replace(/\/graphql\/?$/, '');
}

const hasNotifications = typeof Notification !== 'undefined';

export default function SlotNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [perm, setPerm] = useState<NotificationPermission>(
    hasNotifications ? Notification.permission : 'denied',
  );
  const counter = useRef(0);

  // Ask for notification permission once on load.
  useEffect(() => {
    if (hasNotifications && Notification.permission === 'default') {
      Notification.requestPermission().then(setPerm).catch(() => undefined);
    }
  }, []);

  // Connect to the socket and react to slot-found events.
  useEffect(() => {
    const socket: Socket = io(wsUrl(), {
      transports: ['websocket', 'polling'],
    });

    socket.on('slot-found', (e: SlotFound) => {
      // In-app toast (always shown, even if notifications are blocked).
      const key = ++counter.current;
      setToasts((t) => [...t, { ...e, key }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.key !== key)),
        15000,
      );

      // Native web notification with a link to the slots page.
      if (hasNotifications && Notification.permission === 'granted') {
        const n = new Notification('✅ Свободный слот найден', {
          body: `${e.typeLabel} · ${e.date} · свободно ${e.remaining}`,
          tag: `slot-${e.id}`,
        });
        n.onclick = () => {
          window.focus();
          window.open(e.url, '_blank', 'noopener');
        };
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  const dismiss = (key: number) =>
    setToasts((t) => t.filter((x) => x.key !== key));

  const enable = () =>
    Notification.requestPermission().then(setPerm).catch(() => undefined);

  return (
    <div className="toast-stack">
      {hasNotifications && perm === 'default' && (
        <button className="toast toast-enable" onClick={enable}>
          🔔 Включить уведомления о слотах
        </button>
      )}

      {toasts.map((t) => (
        <div key={t.key} className="toast toast-found">
          <button
            className="toast-close"
            onClick={() => dismiss(t.key)}
            aria-label="Закрыть"
          >
            ✕
          </button>
          <div className="toast-title">✅ Свободный слот найден</div>
          <div className="toast-body">
            {t.typeLabel} · {t.date} · свободно {t.remaining}
          </div>
          <a
            className="toast-link"
            href={t.url}
            target="_blank"
            rel="noreferrer"
          >
            Открыть страницу слотов →
          </a>
        </div>
      ))}
    </div>
  );
}
