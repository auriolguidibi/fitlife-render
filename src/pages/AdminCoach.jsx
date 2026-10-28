import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { dateLabel, timeLabel } from '../components/ActivityBits';
import { AdminShell } from './Admin';
import { LiveTab, PlanTab } from './Coach';
import { HostLive } from './News';

/* Lives déjà publiés : l'administrateur peut les terminer */
function LiveList({ refreshKey }) {
  const { notify } = useStore();
  const [lives, setLives] = useState(null);
  const load = useCallback(() => { api.news().then((d) => setLives(d.lives)).catch(() => setLives([])); }, []);
  useEffect(load, [load, refreshKey]);
  const end = async (l) => {
    if (!window.confirm(`Terminer « ${l.title} » ?`)) return;
    try { await api.endLive(l.id); notify('Live terminé'); load(); } catch (e) { notify(e.message); }
  };
  if (!lives?.length) return null;
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-h"><b>Lives en cours ou programmés</b></div>
      {lives.map((l) => (
        <div key={l.id} className="bk">
          <span>{l.title}<small style={{ display: 'block' }}>{l.state === 'live' ? 'En direct' : `${dateLabel(l.startsAt)} · ${timeLabel(l.startsAt)}`} · {l.host.name}</small></span>
          {l.canEnd && <button className="mini-btn danger-t" onClick={() => end(l)}>Terminer</button>}
        </div>
      ))}
    </div>
  );
}

/* L'administrateur remplace un coach absent : menu du jour, live avec lien, live vidéo dans une communauté */
export function AdminCoach() {
  const [tab, setTab] = useState('plan');
  const [tick, setTick] = useState(0);
  return (
    <AdminShell title="Live & menus" sub="Publie à la place d'un coach : menu du jour et lives">
      <div className="seg" role="tablist" aria-label="Outils coach">
        <button role="tab" aria-selected={tab === 'plan'} className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>Menu du jour</button>
        <button role="tab" aria-selected={tab === 'link'} className={tab === 'link' ? 'on' : ''} onClick={() => setTab('link')}>Live (lien)</button>
        <button role="tab" aria-selected={tab === 'video'} className={tab === 'video' ? 'on' : ''} onClick={() => setTab('video')}>Live (vidéo)</button>
      </div>
      <div style={{ paddingTop: 14 }}>
        {tab === 'plan' && <PlanTab />}
        {tab === 'link' && <><HostLive onDone={() => setTick((t) => t + 1)} /><LiveList refreshKey={tick} /></>}
        {tab === 'video' && <LiveTab />}
      </div>
    </AdminShell>
  );
}
