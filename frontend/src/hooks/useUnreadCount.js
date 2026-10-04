import { useEffect, useState } from 'react';
import api from '../api/client';

const EVENT = 'notifications:changed';

/** Call after marking notifications read, so the bell's red dot refreshes immediately. */
export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(EVENT));
}

/** Unread notifications count for the bell. Re-checked on page change and when notified. */
export default function useUnreadCount(pathname) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/notifications/', { params: { limit: 1 } })
      .then((res) => { if (active) setCount(res.data.unread_count); })
      .catch(() => {});
    return () => { active = false; };   // ignore late answers
  }, [pathname, tick]);

  return count;
}