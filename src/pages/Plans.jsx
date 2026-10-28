import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Avatar from '../components/Avatar';
import { BackBtn, Empty } from '../components/ui';

export const localDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toLocaleDateString('sv');   // AAAA-MM-JJ (jour local)
const dayLabel = (d, i) => (i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'short', day: 'numeric' }));

/* Planning alimentaire publié par les coachs, jour par jour. */
export default function Plans() {
  const days = [...Array(7)].map((_, i) => localDay(i));
  const [day, setDay] = useState(days[0]);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError(''); setList(null);
    api.plans(day).then((r) => setList(r.plans)).catch((e) => setError(e.message));
  }, [day]);
  useEffect(load, [load]);

  return (
    <section className="page">
      <div className="topbar"><BackBtn /><h2>Planning alimentaire</h2><span className="sp" /></div>
      <div className="chips px" role="tablist" aria-label="Jour">
        {days.map((d, i) => <button key={d} role="tab" aria-selected={d === day} className={'chip' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>{dayLabel(d, i)}</button>)}
      </div>
      <div className="px" style={{ paddingTop: 14 }} aria-live="polite">
        {error ? <div className="state-box center" role="alert"><b>Impossible de charger le planning</b><p>{error}</p><button className="btn" onClick={load}>Réessayer</button></div>
          : !list ? <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 140, borderRadius: 16 }} /></div>
          : list.length ? list.map((p) => (
            <div key={p.coach.id} className="card plan">
              <div className="plan-h"><Avatar name={p.coach.name} src={p.coach.avatar} /><div><b>{p.coach.name}</b><small>Coach</small></div></div>
              {p.meals.map((m, i) => <div key={i} className="meal"><b>{m.label}</b><p>{m.text}</p></div>)}
            </div>
          )) : <Empty>Aucun coach n'a publié de planning pour ce jour.</Empty>}
      </div>
    </section>
  );
}
