import { useEffect, useState } from 'react';
import api from '../api/client';

/** Unread notifications count for the bell's red dot. Re-checked on every page change. */
export default function useUnreadCount(pathname) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/notifications/', { params: { limit: 1 } })
      .then((res) => { if (active) setCount(res.data.unread_count); })
      .catch(() => {});
    return () => { active = false; };   // ignore late answers after leaving the page
  }, [pathname]);

  return count;
}