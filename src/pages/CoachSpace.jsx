import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import Avatar from '../components/Avatar';
import AccountForms from '../components/AccountForms';
import Icon from '../components/Icon';
import { SideBrand } from '../components/ui';
import { PlanTab } from './Coach';
import { LiveTools } from './AdminCoach';
import { localDay } from './Plans';

/* Espace coach : une application à part, avec sa propre barre de navigation (comme l'espace administrateur) */
const CNAV = [['/coach', 'home', 'Aperçu', true], ['/coach/menus', 'book', 'Menus'], ['/coach/live', 'video', 'Live'], ['/coach/profile', 'user', 'Profil']];

export function CoachNav() {
  return (
    <nav className="tabbar" aria-label="Espace coach">
      <SideBrand />
      {CNAV.map(([to, ic, label, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => 'tab' + (isActive ? ' on' : '')} aria-label={label}><Icon n={ic} /><span className="tl">{label}</span></NavLink>
      ))}
    </nav>
  );
}

export function CoachShell({ title, sub, children }) {
  return (
    <section className="page admin coach-space">
      <div className="topbar"><span className="sp" /><h2>{title}</h2><span className="sp" /></div>
      <div className="px">{sub && <p className="asub">{sub}</p>}{children}</div>
      <CoachNav />
    </section>
  );
}

/* ---------------- aperçu ---------------- */
export function CoachHome() {
  const { user } = useAuth();
  const [plans, setPlans] = useState(null);
  const [lives, setLives] = useState(null);
  useEffect(() => {
    api.coach.plans(localDay(), localDay(60)).then((r) => setPlans(r.plans.map((p) => p.day))).catch(() => setPlans([]));
    api.news().then((d) => setLives(d.lives.filter((l) => l.mine))).catch(() => setLives([]));
  }, []);
  const today = plans?.includes(localDay());
  const shortcuts = [
    ['/coach/menus', 'utensils', today ? "Modifier le menu d'aujourd'hui" : "Publier le menu d'aujourd'hui", 'Petit-déjeuner, déjeuner, collation, dîner'],
    ['/coach/live', 'broadcast', 'Lancer un live', 'Lien YouTube / Vimeo ou vidéo dans ta communauté'],
    ['/coach/profile', 'user', 'Mon compte', 'Nom, e-mail, mot de passe'],
  ];
  return (
    <CoachShell title="Espace coach" sub="Suivi alimentaire et lives pour tes membres">
      <div className="ahero"><Avatar name={user?.name} src={user?.avatar} /><div><small>Bonjour</small><b>{user?.name}</b><small>Coach</small></div></div>
      <div className="kpis">
        <div className="kpi"><small>Menu du jour</small><b>{plans === null ? '…' : today ? 'Publié' : 'À publier'}</b></div>
        <div className="kpi"><small>Jours planifiés</small><b>{plans === null ? '…' : plans.length}</b></div>
        <div className="kpi"><small>Lives actifs</small><b>{lives === null ? '…' : lives.length}</b></div>
      </div>
      {plans && !today && (
        <Link to="/coach/menus" className="menu-cta"><i aria-hidden="true"><Icon n="clock" /></i><div><b>Le menu d'aujourd'hui n'est pas publié</b><small>Tes membres l'attendent sur leur accueil</small></div><em aria-hidden="true"><Icon n="arrow" /></em></Link>
      )}
      <h3 className="h3 ash">Accès rapides</h3>
      <div className="alist">
        {shortcuts.map(([to, em, t, s]) => <Link key={to} to={to} className="alink"><i aria-hidden="true"><Icon n={em} /></i><span><b>{t}</b><small>{s}</small></span><em aria-hidden="true">›</em></Link>)}
      </div>
    </CoachShell>
  );
}

export function CoachMenus() {
  return <CoachShell title="Menus" sub="Un menu par jour, visible sur l'accueil des membres"><PlanTab /></CoachShell>;
}

export function CoachLive() {
  return <CoachShell title="Lives" sub="Tes membres sont prévenus dès que tu lances"><LiveTools /></CoachShell>;
}

export function CoachProfile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { dispatch } = useStore();
  const out = async () => { await logout(); dispatch({ type: 'reset' }); nav('/welcome', { replace: true }); };
  return (
    <CoachShell title="Mon compte">
      <div className="ahero"><Avatar name={user?.name} src={user?.avatar} /><div><small>Coach</small><b>{user?.name}</b><small>{user?.email}</small></div></div>
      <AccountForms />
      <button className="btn ghost" onClick={out}>Se déconnecter</button>
    </CoachShell>
  );
}
