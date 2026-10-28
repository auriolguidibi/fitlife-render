import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { localDay } from '../pages/Plans';

const KEY = 'fl-notif-seen';
const seenIds = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
export const markSeen = (ids) => { try { localStorage.setItem(KEY, JSON.stringify([...new Set([...seenIds(), ...ids])].slice(-80))); } catch { /* stockage indisponible */ } };

/** Notifications du compte (lives, menus, défis, événements) et nombre de non lues ; actualisées toutes les 30 s */
export function useNotifs(enabled = true) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => { api.notifications(localDay()).then((r) => setItems(r.items)).catch(() => {}); }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const h = setInterval(load, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(h); document.removeEventListener('visibilitychange', onVis); };
  }, [enabled, load]);
  const seen = seenIds();
  const unread = (items || []).filter((n) => !seen.has(n.id)).length;
  return { items, unread, reload: load };
}
