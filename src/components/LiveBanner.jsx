import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from './Icon';

const KEY = 'fl-live-hidden';
const hidden = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const hide = (id) => { try { localStorage.setItem(KEY, JSON.stringify([...hidden().slice(-20), id])); } catch { /* stockage indisponible */ } };

/* Bandeau qui prévient l'utilisateur dès qu'un coach ou un admin lance un live, avec un bouton pour le rejoindre */
export default function LiveBanner() {
  const [live, setLive] = useState(null);

  const check = useCallback(() => {
    api.liveNow().then((d) => {
      const seen = hidden();
      const l = d.lives.find((x) => !seen.includes(x.id + x.state));
      setLive(l || null);
    }).catch(() => { /* hors ligne : on réessaie au prochain passage */ });
  }, []);

  useEffect(() => {
    check();
    const h = setInterval(check, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(h); document.removeEventListener('visibilitychange', onVis); };
  }, [check]);

  // décale le contenu pour que le bandeau ne recouvre pas l'en-tête de la page
  useEffect(() => {
    document.documentElement.classList.toggle('has-live', !!live);
    return () => document.documentElement.classList.remove('has-live');
  }, [live]);

  if (!live) return null;
  const on = live.state === 'live';
  const close = () => { hide(live.id + live.state); setLive(null); };
  return (
    <div className={'live-banner' + (on ? ' on' : '')} role="status" aria-live="polite">
      <span className="lb-dot" aria-hidden="true" />
      <div className="lb-t">
        <b>{on ? `${live.host.name} est en direct` : `${live.host.name} lance un live bientôt`}</b>
        <small>{live.title}</small>
      </div>
      <Link to={live.to || '/news'} className="lb-join" onClick={() => hide(live.id + live.state)}><Icon n="video" /> {on ? 'Rejoindre' : 'Voir'}</Link>
      <button className="lb-x" onClick={close} aria-label="Masquer"><Icon n="close" /></button>
    </div>
  );
}
