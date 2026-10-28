import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import Icon from '../components/Icon';
import { Img } from '../components/Media';
import { dateLabel, timeLabel } from '../components/ActivityBits';
import { Empty } from '../components/ui';
import { PostCard } from './Community';
import { fmtValue } from './Challenges';
import { evDate, evTime } from './Events';
import { assetUrl, embedUrl } from '../lib/media';

const toInput = (t) => { const d = new Date(t); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const ago = (t) => {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `il y a ${m} min`;
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
};

/* ---------- live : lecteur intégré (YouTube / Vimeo) ou lien externe ---------- */
function LiveCard({ l, onEnd }) {
  const src = embedUrl(l.url);
  const live = l.state === 'live';
  return (
    <article className={'news-live' + (live ? ' is-live' : '')}>
      <header>
        <span className={'live-pill' + (live ? ' on' : '')}>{live ? 'EN DIRECT' : 'PROGRAMMÉ'}</span>
        <div><b>{l.title}</b><small>{l.host.name} · {live ? `commencé à ${timeLabel(l.startsAt)}` : `${dateLabel(l.startsAt)} · ${timeLabel(l.startsAt)}`}</small></div>
        {l.canEnd && <button className="mini-btn danger-t" onClick={() => onEnd(l)}>Terminer</button>}
      </header>
      {live && src ? (
        <div className="player"><iframe src={`${src}${src.includes('?') ? '&' : '?'}autoplay=0`} title={l.title} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" /></div>
      ) : live ? (
        <a className="btn" href={l.url} target="_blank" rel="noopener noreferrer"><Icon n="video" /> Rejoindre le live</a>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Le lecteur s'affichera ici dès le début du live.</p>
      )}
      {l.description && <p className="news-desc">{l.description}</p>}
    </article>
  );
}

/* ---------- formulaire : l'admin ou le coach lance / programme un live ---------- */
export function HostLive({ onDone }) {
  const { notify } = useStore();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: '', url: '', description: '', startsAt: toInput(Date.now()) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.startLive({ ...v, startsAt: new Date(v.startsAt).getTime() }); notify('Live publié dans les actualités'); setOpen(false); setV({ title: '', url: '', description: '', startsAt: toInput(Date.now()) }); onDone(); }
    catch (err) { setError(err.message); }
    setBusy(false);
  };
  if (!open) return <button className="btn host-btn" onClick={() => setOpen(true)}><Icon n="video" /> Lancer ou programmer un live</button>;
  return (
    <form className="card admin-form" onSubmit={submit} noValidate>
      <div className="card-h"><b>Nouveau live</b></div>
      <div className="fld"><label htmlFor="l-t">Titre</label><input id="l-t" value={v.title} onChange={set('title')} maxLength={80} placeholder="ex. Cardio du samedi avec Karim" /></div>
      <div className="fld"><label htmlFor="l-u">Lien du live (YouTube, Vimeo…)</label><input id="l-u" value={v.url} onChange={set('url')} inputMode="url" placeholder="https://www.youtube.com/live/…" /></div>
      <div className="fld"><label htmlFor="l-d">Description (facultatif)</label><textarea id="l-d" value={v.description} onChange={set('description')} maxLength={500} rows={3} /></div>
      <div className="fld"><label htmlFor="l-s">Début</label><input id="l-s" type="datetime-local" value={v.startsAt} onChange={set('startsAt')} /></div>
      <p className="muted" style={{ margin: '0 0 8px' }}>Démarre ton direct sur YouTube ou Vimeo, colle son lien ici : le live s'affiche dans l'application, pour tous les membres.</p>
      {error && <div className="form-err" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Publication…' : 'Publier le live'}</button>
      <button className="btn ghost" type="button" onClick={() => setOpen(false)} disabled={busy}>Annuler</button>
    </form>
  );
}

function Section({ title, to, children }) {
  return (
    <div className="news-sec">
      <div className="sec px0"><h3>{title}</h3>{to && <Link to={to}>Tout voir</Link>}</div>
      {children}
    </div>
  );
}

export default function News() {
  const { notify } = useStore();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); api.news().then(setD).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  useEffect(() => { const h = setInterval(load, 60000); return () => clearInterval(h); }, [load]);   // un live peut démarrer pendant qu'on lit

  const endLive = async (l) => {
    if (!window.confirm(`Terminer « ${l.title} » ?`)) return;
    try { await api.endLive(l.id); notify('Live terminé'); load(); } catch (e) { notify(e.message); }
  };
  const delPost = async (p) => {
    try { await api.deletePost(p.id); notify('Publication retirée'); load(); } catch (e) { notify(e.message); }
  };
  const joinCh = async (c) => {
    try { await api.joinChallenge(c.id); notify('Tu participes au défi'); load(); } catch (e) { notify(e.message); }
  };

  return (
    <section className="page news">
      <header className="news-head px">
        <small>FitLife</small>
        <h1>Actualités</h1>
        <p>Lives, nouveaux défis, publications de la communauté et prochains événements.</p>
      </header>
      <div className="px news-body">
        {d?.canHost && <HostLive onDone={load} />}
        {error ? (
          <div className="state-box center" role="alert"><b>Impossible de charger les actualités</b><p>{error}</p><button className="btn" onClick={load}>Réessayer</button></div>
        ) : !d ? (
          <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 160, borderRadius: 20 }} /></div>
        ) : (
          <>
            {d.lives.length > 0 && <Section title="Lives">{d.lives.map((l) => <LiveCard key={l.id} l={l} onEnd={endLive} />)}</Section>}

            <Section title="Nouveaux défis" to="/activity/challenges">
              {d.challenges.length ? (
                <div className="news-grid">
                  {d.challenges.map((c) => (
                    <div key={c.id} className="news-ch">
                      <Link to={`/activity/challenges/${c.id}`} className="news-ch-main">
                        <span className="news-tag">{c.official ? 'Défi officiel' : 'Nouveau défi'} · {ago(c.createdAt)}</span>
                        <b>{c.title}</b>
                        <small>Objectif : {fmtValue(c.metric, c.target)} · jusqu'au {dateLabel(c.endsAt)}</small>
                        <small>{c.participants} {c.participants === 1 ? 'participant' : 'participants'}</small>
                      </Link>
                      {c.joined ? <span className="news-joined"><Icon n="check" /> Inscrit</span> : <button className="mini-btn" onClick={() => joinCh(c)}>Participer</button>}
                    </div>
                  ))}
                </div>
              ) : <Empty>Aucun défi en cours pour le moment.</Empty>}
            </Section>

            <Section title="Nouvelles publications" to="/activity/community">
              {d.posts.length ? <div className="news-grid posts">{d.posts.map((p) => <PostCard key={p.id} p={p} admin={user?.admin} onDelete={delPost} />)}</div> : <Empty>Personne n'a encore publié de résultat.</Empty>}
            </Section>

            {d.events.length > 0 && (
              <Section title="À venir" to="/activity/events">
                <div className="lst grid">
                  {d.events.map((e) => (
                    <Link key={e.id} to={`/activity/events/${e.id}`} className="row">
                      <div className="thumb"><Img src={assetUrl(e.image)} /></div>
                      <div className="t"><b>{e.title}</b><small>{evDate(e.startsAt)} · {evTime(e.startsAt)}</small><small>{e.participants} {e.participants === 1 ? 'inscrit' : 'inscrits'}</small></div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </section>
  );
}
