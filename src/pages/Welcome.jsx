import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { Vid } from '../components/Media';
import AuthSheet from '../components/AuthSheet';
import AuthForm from '../components/AuthForm';
import Icon from '../components/Icon';
import { assetUrl } from '../lib/media';

const BASE = import.meta.env.BASE_URL;
const asset = (p) => assetUrl(p) || undefined;
// vidéo d'accueil claire et lumineuse (course en extérieur) : elle remplace l'ancienne vidéo de salle sombre,
// une autre vidéo choisie par l'admin dans le contenu reste respectée
const OLD_VIDEO = 'media/videos/weights.mp4';
const BRIGHT = { video: 'media/videos/run.mp4', poster: 'media/photos/37718409.jpg' };

/* ordinateur : le formulaire s'affiche directement dans la page, à côté de la vidéo */
function useWide() {
  const q = '(min-width:1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setWide(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return wide;
}

export default function Welcome() {
  const nav = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const { dispatch, notify } = useStore();
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // null | 'register' | 'login'
  const opener = useRef(null);

  const load = useCallback(() => {
    setError('');
    api.welcome().then(setContent).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const proceed = useCallback((u) => {
    if (u?.name) dispatch({ type: 'name', name: u.name });
    nav(u?.admin ? '/admin' : u?.coach ? '/coach' : u?.onboarded ? '/home' : '/goals', { replace: true });
  }, [dispatch, nav]);

  const openSheet = (mode) => (e) => { opener.current = e.currentTarget; setSheet(mode); };
  const closeSheet = () => { setSheet(null); setTimeout(() => opener.current?.focus(), 0); };

  const first = user?.name?.split(' ')[0];
  const wide = useWide();
  const video = content ? asset(content.video === OLD_VIDEO ? BRIGHT.video : content.video) : undefined;
  const poster = content ? asset(content.video === OLD_VIDEO ? BRIGHT.poster : content.poster) : undefined;

  if (wide) {
    return (
      <section className="wl">
        <div className="wl-hero">
          <div className="wl-video">{content ? <Vid src={video} poster={poster} pos="center 30%" /> : <div className="art skeleton" />}</div>
          <div className="wl-shade" />
          <div className="wl-top"><img src={`${BASE}logo.png`} alt="" width="40" height="40" /><span>Fit<b>Life</b></span></div>
          {content && (
            <div className="wl-copy">
              <span className="wl-badge"><i />Fitness &amp; santé</span>
              <h1>{content.titleLines.map((l, i) => <span key={i} className={i === content.titleLines.length - 1 ? 'hl' : ''}>{l}{i < content.titleLines.length - 1 && <br />}</span>)}</h1>
              <p>{content.subtitle}</p>
              <div className="wl-feats">
                <div><i aria-hidden="true"><Icon n="dumbbell" /></i><b>Séances guidées</b><small>Démonstrations animées de chaque exercice</small></div>
                <div><i aria-hidden="true"><Icon n="broadcast" /></i><b>Lives avec ton coach</b><small>Préviens-toi dès qu'un direct démarre</small></div>
                <div><i aria-hidden="true"><Icon n="utensils" /></i><b>Menus du jour</b><small>Un suivi alimentaire signé de ton coach</small></div>
              </div>
            </div>
          )}
        </div>
        <div className="wl-panel">
          <div className="wl-card">
            {error ? (
              <div className="state-box" role="alert"><b>Impossible de charger la page</b><p>{error}</p><button className="btn" onClick={load}>Réessayer</button></div>
            ) : authLoading ? (
              <div className="skeleton" style={{ height: 320, borderRadius: 20 }} aria-busy="true" />
            ) : user ? (
              <div className="wl-back">
                <span className="wl-wave" aria-hidden="true"><Icon n="tick" /></span>
                <h2>Content de te revoir, {first} !</h2>
                <p>Ta session est toujours ouverte.</p>
                <button className="af-submit" onClick={() => proceed(user)}>Continuer<span style={{ width: 8 }} /></button>
                <p className="af-foot"><button type="button" onClick={async () => { await logout(); notify('Déconnecté'); }}>Pas {first} ? Se déconnecter</button></p>
              </div>
            ) : (
              <AuthForm inline initialMode="register" onDone={(u) => proceed(u)} />
            )}
          </div>
          <p className="wl-legal"><Icon n="lock" /> Tes données restent privées. Ton numéro sert uniquement à te prévenir des lives et des informations de ton coach.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="onb">
      <div className="onb-art">
        {content ? <Vid src={asset(content.video === OLD_VIDEO ? BRIGHT.video : content.video)} poster={asset(content.video === OLD_VIDEO ? BRIGHT.poster : content.poster)} pos="center 30%" /> : <div className="art skeleton" />}
      </div>
      <div className="txt">
        <div className="brand"><img className="brand-mark" src={`${BASE}logo.png`} alt="" width="34" height="34" /><span className="brand-name">{content ? <>{content.brand.slice(0, 3)}<span>{content.brand.slice(3)}</span></> : <>Fit<span>Life</span></>}</span></div>

        {error ? (
          <div className="state-box" role="alert">
            <b>Impossible de charger la page</b>
            <p>{error}</p>
            <button className="btn" onClick={load}>Réessayer</button>
          </div>
        ) : !content ? (
          <div className="sk-lines" aria-busy="true" aria-label="Chargement"><i /><i /><i /><b /></div>
        ) : (
          <>
            <h1>{content.titleLines.map((l, i) => <span key={i}>{l}{i < content.titleLines.length - 1 && <br />}</span>)}</h1>
            <p>{content.subtitle}</p>
            {authLoading ? (
              <button className="btn" disabled>…</button>
            ) : user ? (
              <>
                <button className="btn" onClick={() => proceed(user)}>Continuer en tant que {first}</button>
                <button className="link-btn" onClick={async () => { await logout(); notify('Déconnecté'); }}>Pas {first} ? Se déconnecter</button>
              </>
            ) : (
              <>
                <button className="btn" onClick={openSheet('register')}>{content.cta}</button>
                <button className="link-btn" onClick={openSheet('login')}>J'ai déjà un compte · <u>Se connecter</u></button>
              </>
            )}
          </>
        )}
      </div>
      {sheet && <AuthSheet initialMode={sheet} onClose={closeSheet} onDone={(u) => { setSheet(null); proceed(u); }} />}
    </section>
  );
}
