import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';
import { useAuth } from '../auth';
import RouteMap from '../components/RouteMap';
import { TypePhoto, dateLabel, timeLabel } from '../components/ActivityBits';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import AccountForms from '../components/AccountForms';
import { BackBtn, Empty, SearchBox } from '../components/ui';
import { fmtDistance, fmtDuration, fmtKm, fmtPace, fmtSpeed, typeOf } from '../lib/tracker';

/* barre du bas de l'espace administrateur : même barre que l'application */
const ANAV = [['/admin', 'home', 'Aperçu', true], ['/admin/users', 'users', 'Comptes'], ['/admin/content', 'book', 'Contenu'], ['/admin/events', 'clock', 'Événements'], ['/admin/profile', 'user', 'Profil']];
export function AdminNav() {
  return (
    <nav className="tabbar" aria-label="Espace administrateur">
      {ANAV.map(([to, ic, label, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => 'tab' + (isActive ? ' on' : '')} aria-label={label}><Icon n={ic} /><span className="tl">{label}</span></NavLink>
      ))}
    </nav>
  );
}

export function AdminShell({ title = 'Administration', sub, back, children }) {
  return (
    <section className="page admin">
      <div className="topbar">{back ? <BackBtn to={back} /> : <span className="sp" />}<h2>{title}</h2><span className="sp" /></div>
      <div className="px">{sub && <p className="asub">{sub}</p>}{children}</div>
      <AdminNav />
    </section>
  );
}

const RoleBadges = ({ u }) => <>{u.admin && <span className="best role">Admin</span>}{u.coach && <span className="best role coach">Coach</span>}</>;

/* ---------------- profil de l'administrateur ---------------- */
export function AdminProfile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { dispatch } = useStore();
  const out = async () => { await logout(); dispatch({ type: 'reset' }); nav('/welcome', { replace: true }); };
  return (
    <AdminShell title="Mon profil">
      <div className="ahero"><Avatar name={user?.name} src={user?.avatar} /><div><small>Administrateur</small><b>{user?.name}</b><small>{user?.email}</small></div></div>
      <AccountForms />
      <button className="btn ghost" onClick={out}>Se déconnecter</button>
    </AdminShell>
  );
}

function ErrorBox({ title, message, onRetry }) {
  return <div className="state-box center" role="alert"><b>{title}</b><p>{message}</p><button className="btn" onClick={onRetry}>Réessayer</button></div>;
}
const frDate = (t) => new Date(t).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------------- aperçu ---------------- */
export function AdminHome() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); api.admin.overview().then(setD).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  const C = d?.counts;
  const cards = d ? [
    ['Comptes', C.users, 'users', '/admin/users'], ['Activités', C.activities, 'route', '/admin/users'], ['Séances', C.workouts, 'fire', '/admin/content'], ['Cours', C.courses, 'book', '/admin/content'],
    ['Coachs (fiches)', C.trainers, 'star', '/admin/content'], ['Événements', C.events, 'clock', '/admin/events'], ['Défis', C.challenges, 'trophy'], ['Publications', C.posts, 'chat'],
  ] : [];
  const shortcuts = [['Gérer les comptes', 'Voir chaque compte, ses activités et son parcours', 'users', '/admin/users'], ['Contenu', 'Séances (avec vidéos), cours, objectifs, coachs', 'book', '/admin/content'], ['Événements', 'Créer des événements et suivre les inscriptions', 'clock', '/admin/events']];
  return (
    <AdminShell sub="Vue d'ensemble de FitLife">
      <div className="ahero"><Avatar name={user?.name} src={user?.avatar} /><div><small>Bonjour</small><b>{user?.name}</b><small>Administrateur</small></div></div>
      {error ? <ErrorBox title="Impossible de charger l'aperçu" message={error} onRetry={load} /> : !d ? (
        <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 180, borderRadius: 16 }} /></div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><small>Distance totale</small><b>{fmtKm(d.totals.distance)}<em> km</em></b></div>
            <div className="kpi"><small>Temps total</small><b>{fmtDuration(d.totals.duration)}</b></div>
            <div className="kpi"><small>Pas</small><b>{d.totals.steps.toLocaleString('fr')}</b></div>
          </div>
          <div className="card weekcard"><b>Cette semaine</b><p className="muted">{d.week.users} {d.week.users === 1 ? 'nouveau compte' : 'nouveaux comptes'} · {d.week.activities} {d.week.activities === 1 ? 'activité enregistrée' : 'activités enregistrées'}</p></div>
          <div className="admin-grid">
            {cards.map(([label, n, ic, to]) => {
              const inner = <><i className="sc-ic"><Icon n={ic} /></i><b>{n}</b><small>{label}</small></>;
              return to ? <Link key={label} to={to} className="stat-card">{inner}</Link> : <div key={label} className="stat-card">{inner}</div>;
            })}
          </div>
          <h3 className="h3 ash">Accès rapides</h3>
          <div className="alist">
            {shortcuts.map(([t, s, ic, to]) => <Link key={to} to={to} className="alink"><i><Icon n={ic} /></i><span><b>{t}</b><small>{s}</small></span><em aria-hidden="true">›</em></Link>)}
          </div>
        </>
      )}
    </AdminShell>
  );
}

/* ---------------- comptes ---------------- */
export function AdminUsers() {
  const [q, setQ] = useState('');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const stamp = useRef(0);
  const load = useCallback((query) => {
    const n = ++stamp.current;
    setError('');
    api.admin.users(query.trim()).then((r) => { if (n === stamp.current) setD(r); }).catch((e) => { if (n === stamp.current) setError(e.message); });
  }, []);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; load(''); return undefined; }
    const h = setTimeout(() => load(q), 250);
    return () => clearTimeout(h);
  }, [q, load]);

  return (
    <AdminShell title="Comptes">
      <SearchBox value={q} onChange={setQ} placeholder="Rechercher un nom ou un e-mail" />
      {error ? <ErrorBox title="Impossible de charger les comptes" message={error} onRetry={() => load(q)} /> : !d ? (
        <div className="lst" aria-busy="true" aria-label="Chargement" style={{ marginTop: 14 }}><div className="row skeleton" /><div className="row skeleton" /></div>
      ) : (
        <>
          <p className="muted" style={{ margin: '12px 2px 8px' }}>{d.users.length} {d.users.length === 1 ? 'compte affiché' : 'comptes affichés'} sur {d.total}</p>
          <div className="lst grid">
            {d.users.length ? d.users.map((u) => (
              <Link key={u.id} to={`/admin/users/${u.id}`} className="row">
                <Avatar name={u.name} src={u.avatar} size="sm" />
                <div className="t">
                  <b>{u.name}<RoleBadges u={u} /></b>
                  <small>{u.email}</small>
                  <small>{u.activities} {u.activities === 1 ? 'activité' : 'activités'} · {fmtKm(u.distance)} km · inscrit le {frDate(u.createdAt)}</small>
                </div>
              </Link>
            )) : <Empty>Aucun compte ne correspond.</Empty>}
          </div>
        </>
      )}
    </AdminShell>
  );
}

/* ---------------- un compte : statistiques, activités, parcours ---------------- */
export function AdminUserDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { notify } = useStore();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const load = useCallback(() => {
    setError('');
    api.admin.user(id).then(setD).catch((e) => (e.status === 404 ? setMissing(true) : setError(e.message)));
  }, [id]);
  useEffect(() => { setD(null); load(); }, [load]);

  if (missing) return <Navigate to="/admin/users" replace />;
  const u = d?.user;
  const reset = async () => {
    if (!window.confirm(`Remettre à zéro les activités de ${u.name} (${u.activities}) ? Cette action est définitive.`)) return;
    try { await api.admin.resetActivities(id); notify('Activités supprimées'); load(); } catch (e) { notify(e.message); }
  };
  const toggleCoach = async () => {
    try { const r = await api.admin.setCoach(id, !u.coach); notify(r.coach ? 'Rôle coach donné' : 'Rôle coach retiré'); load(); } catch (e) { notify(e.message); }
  };
  const removeActivity = async (a) => {
    if (!window.confirm('Supprimer cette activité ?')) return;
    try { await api.admin.deleteActivity(a.id); notify('Activité supprimée'); load(); } catch (e) { notify(e.message); }
  };
  const removeUser = async () => {
    if (!window.confirm(`Supprimer définitivement le compte de ${u.name} et toutes ses données ?`)) return;
    try { await api.admin.deleteUser(id); notify('Compte supprimé'); nav('/admin/users', { replace: true }); } catch (e) { notify(e.message); }
  };

  return (
    <AdminShell title="Compte" back="/admin/users">
      {error ? <ErrorBox title="Impossible de charger ce compte" message={error} onRetry={load} /> : !d ? (
        <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 160, borderRadius: 26 }} /></div>
      ) : (
        <>
          <div className="card">
            <div className="post-h">
              <Avatar name={u.name} src={u.avatar} size="sm" />
              <div><b>{u.name}<RoleBadges u={u} /></b><small>{u.email}</small></div>
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Inscrit le {frDate(u.createdAt)} · {d.challenges} {d.challenges === 1 ? 'défi' : 'défis'} · {d.events} {d.events === 1 ? 'événement' : 'événements'} · {d.posts} {d.posts === 1 ? 'publication' : 'publications'}
              {d.goals.length > 0 && <><br />Objectifs : {d.goals.join(', ')}</>}
            </p>
          </div>
          <div className="stats">
            <div><b>{u.activities}</b><small>Activités</small></div>
            <div><b>{fmtKm(u.distance)}</b><small>km</small></div>
            <div><b>{fmtDuration(u.duration)}</b><small>Temps</small></div>
            <div><b>{u.steps.toLocaleString('fr')}</b><small>Pas</small></div>
            <div><b>{u.workouts}</b><small>Séances</small></div>
          </div>

          <div className="sec" style={{ padding: '14px 0 8px' }}><h3>Activités et parcours</h3><small>{d.activities.length} dernières</small></div>
          <div className="lst grid">
            {d.activities.length ? d.activities.map((a) => (
              <div key={a.id} className="row arow">
                <Link to={`/admin/activities/${a.id}`} className="arow-main">
                  <div className="thumb"><TypePhoto type={a.type} /></div>
                  <div className="t"><b>{typeOf(a.type)?.label ?? a.type} · {fmtDistance(a.distance)}</b><small>{dateLabel(a.startedAt)} · {fmtDuration(a.duration)} · {fmtPace(a.distance, a.duration)}/km</small></div>
                </Link>
                <button className="mini-btn" aria-label="Supprimer cette activité" onClick={() => removeActivity(a)}>Supprimer</button>
              </div>
            )) : <Empty>Aucune activité enregistrée.</Empty>}
          </div>

          {!u.admin && (
            <div className="card rolecard">
              <div className="card-h"><b>Rôle coach</b><small>{u.coach ? 'Activé' : 'Désactivé'}</small></div>
              <p className="muted">Un coach publie son planning alimentaire, jour par jour, et lance des lives. Il garde son compte client.</p>
              <button className={'btn small' + (u.coach ? ' ghost' : '')} onClick={toggleCoach}>{u.coach ? 'Retirer le rôle coach' : 'Donner le rôle coach'}</button>
            </div>
          )}
          <div className="admin-actions">
            {u.activities > 0 && <button className="btn ghost" onClick={reset}>Remettre à zéro les activités</button>}
            {!u.admin && <button className="btn ghost danger" onClick={removeUser}>Supprimer ce compte</button>}
          </div>
        </>
      )}
    </AdminShell>
  );
}

/* ---------------- une activité : parcours sur la carte ---------------- */
export function AdminActivity() {
  const { id } = useParams();
  const nav = useNavigate();
  const { notify } = useStore();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const load = useCallback(() => {
    setError('');
    api.admin.activity(id).then(setD).catch((e) => (e.status === 404 ? setMissing(true) : setError(e.message)));
  }, [id]);
  useEffect(() => { setD(null); load(); }, [load]);

  if (missing) return <Navigate to="/admin/users" replace />;
  const a = d?.activity;
  const remove = async () => {
    if (!window.confirm('Supprimer cette activité ?')) return;
    try { await api.admin.deleteActivity(id); notify('Activité supprimée'); nav(d.user ? `/admin/users/${d.user.id}` : '/admin/users', { replace: true }); } catch (e) { notify(e.message); }
  };
  return (
    <AdminShell title={a ? (typeOf(a.type)?.label ?? 'Activité') : 'Activité'} back={d?.user ? `/admin/users/${d.user.id}` : '/admin/users'}>
      {error ? <ErrorBox title="Impossible de charger cette activité" message={error} onRetry={load} /> : !d ? (
        <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 220, borderRadius: 26 }} /></div>
      ) : (
        <>
          <p className="sub adate">{d.user ? <>{d.user.name} · {d.user.email}<br /></> : null}{dateLabel(a.startedAt)} · {timeLabel(a.startedAt)}</p>
          <div className="card routecard"><RouteMap points={a.route} /></div>
          <div className="stats">
            <div><b>{fmtKm(a.distance)}</b><small>Kilomètres</small></div>
            <div><b>{fmtDuration(a.duration)}</b><small>Durée</small></div>
            <div><b>{fmtPace(a.distance, a.duration)}</b><small>Allure /km</small></div>
            <div><b>{fmtSpeed(a.distance, a.duration)}</b><small>Vitesse km/h</small></div>
            <div><b>{a.stepsEstimated && a.steps > 0 ? '≈' : ''}{a.steps}</b><small>Pas</small></div>
          </div>
          <button className="btn ghost danger" onClick={remove}>Supprimer cette activité</button>
        </>
      )}
    </AdminShell>
  );
}
