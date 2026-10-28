import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { THEMES } from '../data';
import { THEME_FR } from '../lib/labels';
import { BackBtn, Empty, WorkoutRow } from '../components/ui';
import { useSyncFavs } from '../components/RequireAuth';
import { initials } from './Home';
import AvatarPicker from '../components/AvatarPicker';
import AccountForms from '../components/AccountForms';
import Icon from '../components/Icon';
import { assetUrl } from '../lib/media';

const BASE = import.meta.env.BASE_URL;
const withBase = (o) => ({ ...o, photo: assetUrl(o.photo) });

function ErrorBox({ title, message, onRetry }) {
  return <div className="state-box center" role="alert"><b>{title}</b><p>{message}</p><button className="btn" onClick={onRetry}>Réessayer</button></div>;
}

/* ---------------- Favoris ---------------- */
export function Favorites() {
  const { state } = useStore();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    api.favorites().then((d) => setList(d.workouts.map(withBase))).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useSyncFavs(list);
  // un cœur retiré fait disparaître la séance tout de suite
  const shown = list ? list.filter((w) => state.favs.includes(w.id)) : null;
  return (
    <section className="page">
      <div className="topbar"><BackBtn /><h2>Favoris</h2><span className="sp" /></div>
      {error ? <ErrorBox title="Impossible de charger tes favoris" message={error} onRetry={load} />
        : !shown ? <div className="lst grid px" aria-busy="true" aria-label="Chargement">{[0, 1, 2].map((i) => <div key={i} className="row skeleton" />)}</div>
        : <div className="lst grid px" aria-live="polite">
            {shown.length ? shown.map((w) => <WorkoutRow key={w.id} w={w} />)
              : <Empty>Aucun favori pour le moment.<br />Touche le cœur d'une séance pour la retrouver ici.</Empty>}
          </div>}
    </section>
  );
}

/* ---------------- Profil ---------------- */
export function Profile() {
  const nav = useNavigate();
  const { user, setUser, logout } = useAuth();
  const { dispatch, notify } = useStore();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(300);
  const [danger, setDanger] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const load = useCallback(() => {
    setError('');
    api.profile().then((r) => {
      setD(r); setName(r.user.name); setGoal(r.settings.dailyGoal);
      dispatch({ type: 'hydrate', patch: { dailyGoal: r.settings.dailyGoal, theme: r.settings.theme, name: r.user.name } });
    }).catch((e) => setError(e.message));
  }, [dispatch]);
  useEffect(load, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const saveName = async () => {
    setEditing(false);
    const n = name.trim();
    if (!n || n === d.user.name) { setName(d.user.name); return; }
    try {
      const r = await api.saveName(n);
      setUser((u) => ({ ...u, name: r.user.name }));
      setD((x) => ({ ...x, user: r.user }));
      dispatch({ type: 'hydrate', patch: { name: r.user.name } });
      notify('Nom mis à jour');
    } catch (e) { setName(d.user.name); notify(e.message); }
  };

  const setTheme = async (theme) => {
    const prev = d.settings.theme;
    setD((x) => ({ ...x, settings: { ...x.settings, theme } }));
    dispatch({ type: 'theme', theme }); setUser((u) => ({ ...u, theme }));   // appliqué tout de suite…
    try { await api.saveSettings({ theme }); } catch (e) {                  // …annulé si le serveur refuse
      setD((x) => ({ ...x, settings: { ...x.settings, theme: prev } }));
      dispatch({ type: 'theme', theme: prev }); setUser((u) => ({ ...u, theme: prev })); notify(e.message);
    }
  };

  const changeGoal = (v) => {
    setGoal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveSettings({ dailyGoal: v })
        .then((r) => { dispatch({ type: 'dailyGoal', value: r.settings.dailyGoal }); setD((x) => ({ ...x, settings: r.settings })); })
        .catch((e) => { setGoal(d.settings.dailyGoal); notify(e.message); });
    }, 400);
  };

  const resetProgress = async () => {
    if (!window.confirm('Effacer ton historique de séances et tes favoris ? Ton compte et tes objectifs sont conservés.')) return;
    try { await api.resetProgress(); dispatch({ type: 'hydrate', patch: { favs: [], history: [] } }); notify('Progression réinitialisée'); load(); } catch (e) { notify(e.message); }
  };

  const doLogout = async () => { await logout(); dispatch({ type: 'reset' }); nav('/welcome', { replace: true }); };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!pw) { setPwErr('Entre ton mot de passe pour confirmer.'); return; }
    setBusy(true); setPwErr('');
    try {
      await api.deleteAccount(pw);
      setUser(null); dispatch({ type: 'reset' });
      nav('/welcome', { replace: true });
    } catch (err) { setPwErr(err.fields?.password || err.message); setBusy(false); }
  };

  if (error) {
    return <section className="page"><div className="topbar"><BackBtn /><h2>Profil</h2><span className="sp" /></div><ErrorBox title="Impossible de charger ton profil" message={error} onRetry={load} /></section>;
  }
  if (!d) {
    return <section className="page" aria-busy="true" aria-label="Chargement"><div className="topbar"><BackBtn /><h2>Profil</h2><span className="sp" /></div><div className="prof px"><div className="avatar xl skeleton" /><div className="stats">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}</div></div></section>;
  }

  const max = Math.max(d.settings.dailyGoal, ...d.week.map((x) => x.kcal), 1);
  const role = user?.admin ? 'Administrateur' : user?.coach ? 'Coach' : 'Membre';
  const hours = Math.floor(d.stats.minutes / 60);
  const shortcuts = [
    ['/plans', '🍽️', 'Suivi alimentaire', 'Menus des coachs'],
    ['/history', '🕘', 'Historique', 'Toute mon activité'],
    ['/favorites', '❤️', 'Favoris', 'Mes séances préférées'],
    ['/notifications', '🔔', 'Notifications', 'Lives, menus, défis'],
    ...(user?.coach ? [['/coach', '🧑‍🏫', 'Espace coach', 'Menus, lives']] : []),
    ...(user?.admin ? [['/admin', '🛡️', 'Administration', 'Comptes, contenu']] : []),
  ];
  return (
    <section className="page pf">
      <div className="topbar"><BackBtn /><h2>Mon profil</h2><span className="sp" /></div>
      <div className="prof px">
        <header className="pf-hero">
          <div className="pf-cover" aria-hidden="true" />
          <div className="pf-av"><AvatarPicker /></div>
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="name-edit">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} maxLength={40} aria-label="Ton nom" />
            </form>
          ) : (
            <h2 className="pf-name" onClick={() => setEditing(true)}>{d.user.name} <button aria-label="Modifier le nom" className="mini-btn"><Icon n="edit" /></button></h2>
          )}
          <p className="pf-mail">{d.user.email}</p>
          <span className={'pf-role' + (user?.admin || user?.coach ? ' pro' : '')}>{role}</span>
          <div className="pf-kpis">
            <div><b>{d.stats.workouts}</b><small>Séances</small></div>
            <div><b>{d.stats.kcal.toLocaleString('fr')}</b><small>kcal brûlées</small></div>
            <div><b>{hours ? `${hours} h` : `${d.stats.minutes} min`}</b><small>d'entraînement</small></div>
            <div><b>{d.stats.streak}</b><small>jours d'affilée</small></div>
          </div>
        </header>

        <h3 className="pf-h">Raccourcis</h3>
        <div className="pf-tiles">
          {shortcuts.map(([to, em, t, sub]) => (
            <Link key={to} to={to} className="pf-tile"><i aria-hidden="true">{em}</i><b>{t}</b><small>{sub}</small></Link>
          ))}
        </div>

        <h3 className="pf-h">Mon activité</h3>
        <div className="card">
          <div className="card-h"><b>Cette semaine</b><small>kcal / jour</small></div>
          <div className="bars">
            {d.week.map((x, i) => (
              <div key={i} className={'bar-c' + (x.today ? ' is-today' : '')}>
                <span className="bv">{x.kcal || ''}</span>
                <i style={{ height: `${Math.max(4, (x.kcal / max) * 100)}%` }} />
                <small>{x.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><b>Objectif calorique quotidien</b><small>{goal} kcal</small></div>
          <input type="range" min="100" max="800" step="50" value={goal} onChange={(e) => changeGoal(+e.target.value)} aria-label="Objectif calorique quotidien" />
        </div>
        <div className="card">
          <div className="card-h"><b>Mes objectifs</b><Link to="/goals" className="lnk">Modifier</Link></div>
          <div className="tagrow">{d.goals.length ? d.goals.map((g) => <i key={g.id}>{g.label}</i>) : <i>Aucun objectif sélectionné</i>}</div>
        </div>

        <h3 className="pf-h">Dernières séances</h3>
        <div className="card">
          {d.recent.length ? d.recent.map((r) => (
            <Link key={r.id} to={`/workout/${r.workoutId}`} className="bk">
              <span>{r.title}</span><small>{new Date(r.date).toLocaleDateString('fr', { month: 'short', day: 'numeric' })} · {r.kcal} kcal · {Math.max(1, Math.round(r.seconds / 60))} min</small>
            </Link>
          )) : <p className="muted">Aucune séance pour le moment : tes séances apparaîtront ici.</p>}
        </div>
        {d.bookings.length > 0 && (
          <div className="card">
            <div className="card-h"><b>Séances réservées</b></div>
            {d.bookings.map((b) => (
              <Link key={b.trainerId} to={`/trainers/${b.trainerId}`} className="bk"><span>{b.name}</span><small>{b.day} · {b.slot}</small></Link>
            ))}
          </div>
        )}

        <h3 className="pf-h">Paramètres</h3>
        <div className="card">
          <div className="card-h"><b>Couleur d'accent</b></div>
          <div className="swatches">
            {Object.entries(THEMES).map(([k, c]) => (
              <button key={k} aria-label={THEME_FR[k] ?? k} aria-pressed={d.settings.theme === k} className={d.settings.theme === k ? 'on' : ''} style={{ background: c }} onClick={() => setTheme(k)}>
                {d.settings.theme === k && <Icon n="check" />}
              </button>
            ))}
          </div>
        </div>
        <details className="pf-acc card">
          <summary><b>Informations du compte</b><small>Nom, e-mail, mot de passe</small></summary>
          <AccountForms />
        </details>

        <button className="btn ghost" onClick={doLogout}>Se déconnecter</button>
        <button className="btn ghost danger" onClick={resetProgress}>Réinitialiser ma progression</button>
        {!danger ? (
          <button className="link-btn" onClick={() => setDanger(true)}>Supprimer mon compte…</button>
        ) : (
          <form className="card danger-card" onSubmit={deleteAccount} noValidate>
            <div className="card-h"><b>Supprimer mon compte</b></div>
            <p className="muted">Cette action efface définitivement ton compte, tes objectifs, ton historique, tes favoris et tes activités. Entre ton mot de passe pour confirmer.</p>
            <div className={'fld' + (pwErr ? ' bad' : '')}>
              <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setPwErr(''); }} autoComplete="current-password" aria-label="Mot de passe" aria-invalid={!!pwErr} placeholder="Ton mot de passe" />
              {pwErr && <small role="alert">{pwErr}</small>}
            </div>
            <button className="btn danger-solid" type="submit" disabled={busy}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</button>
            <button className="link-btn" type="button" onClick={() => { setDanger(false); setPw(''); setPwErr(''); }}>Annuler</button>
          </form>
        )}
      </div>
    </section>
  );
}
