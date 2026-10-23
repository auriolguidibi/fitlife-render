import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { BackBtn, Empty } from '../components/ui';
import { localDay } from './Plans';

const SUGGEST = ['Petit-déjeuner', 'Collation', 'Déjeuner', 'Goûter', 'Dîner'];
const frDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' });

/* ---------------- planning alimentaire ---------------- */
function PlanTab() {
  const { notify } = useStore();
  const [day, setDay] = useState(localDay());
  const [meals, setMeals] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUpcoming = useCallback(() => { api.coach.plans(localDay(), localDay(60)).then((r) => setUpcoming(r.plans.map((p) => p.day))).catch(() => {}); }, []);
  useEffect(loadUpcoming, [loadUpcoming]);
  useEffect(() => {
    setMeals(null); setError('');
    api.coach.plans(day, day).then((r) => setMeals(r.plans[0]?.meals ?? [])).catch((e) => setError(e.message));
  }, [day]);

  const setMeal = (i, k, v) => setMeals((m) => m.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const save = async (list) => {
    setBusy(true); setError('');
    try {
      const r = await api.coach.savePlan(day, list.map((m) => ({ label: m.label.trim(), text: m.text.trim() })));
      setMeals(r.plan ? r.plan.meals : []);
      notify(r.plan ? 'Planning enregistré' : 'Planning supprimé');
      loadUpcoming();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const submit = (e) => { e.preventDefault(); save(meals.filter((m) => m.label.trim() || m.text.trim())); };

  return (
    <>
      <div className="fld"><label htmlFor="pl-d">Jour</label><input id="pl-d" type="date" value={day} min={localDay(-1)} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
      {upcoming.length > 0 && (
        <div className="chips" aria-label="Jours déjà planifiés">{upcoming.map((d) => <button key={d} className={'chip small' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>{new Date(`${d}T12:00:00`).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}</button>)}</div>
      )}
      <form onSubmit={submit} style={{ marginTop: 14 }}>
        <h3 className="h3" style={{ textTransform: 'capitalize' }}>{frDay(day)}</h3>
        {meals === null && !error ? <div className="skeleton" style={{ height: 120, borderRadius: 16 }} aria-busy="true" /> : (meals ?? []).map((m, i) => (
          <div key={i} className="card meal-edit">
            <div className="fld"><label htmlFor={`m-l${i}`}>Repas</label><input id={`m-l${i}`} list="meal-labels" value={m.label} onChange={(e) => setMeal(i, 'label', e.target.value)} maxLength={40} placeholder="ex. Déjeuner" /></div>
            <div className="fld"><label htmlFor={`m-t${i}`}>Contenu</label><textarea id={`m-t${i}`} rows={3} value={m.text} onChange={(e) => setMeal(i, 'text', e.target.value)} maxLength={600} /></div>
            <button type="button" className="link-btn" onClick={() => setMeals((x) => x.filter((_, j) => j !== i))}>Retirer ce repas</button>
          </div>
        ))}
        <datalist id="meal-labels">{SUGGEST.map((s) => <option key={s} value={s} />)}</datalist>
        {meals && meals.length === 0 && <Empty>Aucun repas pour ce jour.<br />Ajoute-en pour publier ton planning.</Empty>}
        {error && <div className="form-err" role="alert">{error}</div>}
        {meals && (
          <>
            {meals.length < 8 && <button type="button" className="btn ghost small" onClick={() => setMeals((x) => [...x, { label: '', text: '' }])}>Ajouter un repas</button>}
            <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10 }}>{busy ? 'Enregistrement…' : 'Publier le planning'}</button>
            {upcoming.includes(day) && <button type="button" className="btn ghost danger" disabled={busy} onClick={() => { if (window.confirm('Supprimer le planning de ce jour ?')) save([]); }}>Supprimer ce planning</button>}
          </>
        )}
      </form>
    </>
  );
}

/* ---------------- lives ---------------- */
function LiveTab() {
  const nav = useNavigate();
  const { notify } = useStore();
  const [comms, setComms] = useState(null);
  const [error, setError] = useState('');
  const [pick, setPick] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.social.communities().then((r) => {
      const mine = r.mine.filter((c) => c.role === 'owner' || c.role === 'admin');
      setComms(mine); setPick(mine[0]?.id ?? '');
    }).catch((e) => setError(e.message));
  }, []);

  const go = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const c = comms.find((x) => x.id === pick);
      const d = await api.social.community(pick);
      const r = await api.social.startCall(d.conversationId, { kind: 'live', title: title.trim() || `Live : ${c.name}`, startsAt: Date.now() });
      notify('Live lancé');
      nav(`/social/call/${r.call.id}`);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  if (error && !comms) return <div className="state-box center" role="alert"><b>Impossible de charger tes communautés</b><p>{error}</p></div>;
  if (!comms) return <div className="skeleton" style={{ height: 120, borderRadius: 16 }} aria-busy="true" />;
  if (!comms.length) {
    return (
      <div className="card">
        <p className="muted">Un live se lance dans une communauté : tes membres sont prévenus dans son chat et le rejoignent en vidéo. Crée d'abord ta communauté.</p>
        <Link to="/social/communities/new" className="btn small">Créer ma communauté</Link>
      </div>
    );
  }
  return (
    <form onSubmit={go} className="card">
      <div className="fld"><label htmlFor="lv-c">Communauté</label><select id="lv-c" value={pick} onChange={(e) => setPick(e.target.value)}>{comms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="fld"><label htmlFor="lv-t">Titre du live</label><input id="lv-t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="ex. Séance de renforcement en direct" /></div>
      <p className="muted">Le live démarre tout de suite et tes membres le voient dans le chat de la communauté. 6 participants au maximum en vidéo. Pour programmer un live plus tard, ouvre la communauté.</p>
      {error && <div className="form-err" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy || !pick}>{busy ? 'Lancement…' : 'Lancer le live maintenant'}</button>
      <Link to={`/social/communities/${pick}`} className="link-btn" style={{ display: 'block', textAlign: 'center', marginTop: 10 }}>Programmer un live à une date</Link>
    </form>
  );
}

/* ---------------- espace coach ---------------- */
export default function Coach() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('plan');
  if (loading) return null;
  if (!user?.coach) return <Navigate to="/profile" replace />;
  return (
    <section className="page">
      <div className="topbar"><BackBtn to="/profile" /><h2>Espace coach</h2><span className="sp" /></div>
      <div className="px">
        <div className="seg" role="tablist" aria-label="Espace coach">
          <button role="tab" aria-selected={tab === 'plan'} className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>Planning alimentaire</button>
          <button role="tab" aria-selected={tab === 'live'} className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>Live</button>
        </div>
        <div style={{ paddingTop: 14 }}>{tab === 'plan' ? <PlanTab /> : <LiveTab />}</div>
      </div>
    </section>
  );
}
