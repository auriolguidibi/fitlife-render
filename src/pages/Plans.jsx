import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import MealCard from '../components/MealCard';
import { BackBtn, Empty } from '../components/ui';

export const localDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toLocaleDateString('sv');   // AAAA-MM-JJ (jour local)
const wd = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'short' }).replace('.', '');
const dn = (d) => new Date(`${d}T12:00:00`).getDate();
const long = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' });

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
      <div className="topbar"><BackBtn /><h2>Suivi alimentaire</h2><span className="sp" /></div>
      <div className="daybar px" role="tablist" aria-label="Jour">
        {days.map((d, i) => (
          <button key={d} role="tab" aria-selected={d === day} className={'dayb' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>
            <small>{i === 0 ? 'Auj.' : wd(d)}</small><b>{dn(d)}</b>
          </button>
        ))}
      </div>
      <p className="px plans-date">{long(day)}</p>
      <div className="px plans-list" aria-live="polite">
        {error ? <div className="state-box center" role="alert"><b>Impossible de charger le planning</b><p>{error}</p><button className="btn" onClick={load}>Réessayer</button></div>
          : !list ? <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 200, borderRadius: 20 }} /></div>
          : list.length ? list.map((p) => <MealCard key={p.coach.id} plan={p} day={day === days[0] ? 'du jour' : 'de la journée'} />)
          : <Empty>Aucun coach n'a encore publié de menu pour ce jour.<br />Reviens un peu plus tard.</Empty>}
      </div>
    </section>
  );
}
