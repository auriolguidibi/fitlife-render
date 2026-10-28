import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Img } from './Media';
import { TypePhoto, dateLabel, timeLabel } from './ActivityBits';
import { assetUrl, youtubeId } from '../lib/media';
import { fmtDistance, fmtDuration, typeOf } from '../lib/tracker';
import { fmtValue } from '../pages/Challenges';

const DAYS = (t) => Math.max(0, Math.ceil((t - Date.now()) / 86400000));

/* Transforme la réponse de /api/news en tuiles : lives, défis, événements, publications */
function toTiles(d) {
  const tiles = [];
  for (const l of d.lives) {
    const yt = youtubeId(l.url);
    tiles.push({ key: 'l' + l.id, to: '/news', tag: l.state === 'live' ? 'EN DIRECT' : 'Live', hot: l.state === 'live', title: l.title,
      sub: l.state === 'live' ? `${l.host.name} · en cours` : `${dateLabel(l.startsAt)} · ${timeLabel(l.startsAt)}`,
      img: yt ? <Img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} /> : <TypePhoto type="run" /> });
  }
  for (const c of d.challenges) {
    tiles.push({ key: 'c' + c.id, to: `/activity/challenges/${c.id}`, tag: c.official ? 'Défi officiel' : 'Nouveau défi', title: c.title,
      sub: `${fmtValue(c.metric, c.target)} · ${DAYS(c.endsAt)} j restants`, img: <TypePhoto type={c.type === 'any' ? 'run' : c.type} /> });
  }
  for (const e of d.events) {
    tiles.push({ key: 'e' + e.id, to: `/activity/events/${e.id}`, tag: 'Événement', title: e.title,
      sub: `${dateLabel(e.startsAt)} · ${timeLabel(e.startsAt)}`, img: e.image ? <Img src={assetUrl(e.image)} /> : <TypePhoto type="hike" /> });
  }
  for (const p of d.posts) {
    const a = p.activity;
    tiles.push({ key: 'p' + p.id, to: '/activity/community', tag: 'Publication', title: `${p.author.name} · ${typeOf(a.type)?.label ?? a.type}`,
      sub: `${fmtDistance(a.distance)} · ${fmtDuration(a.duration)}`, img: <TypePhoto type={a.type} /> });
  }
  return tiles;
}

export default function NewsHome() {
  const [tiles, setTiles] = useState(null);
  useEffect(() => { api.news().then((d) => setTiles(toTiles(d))).catch(() => setTiles([])); }, []);
  if (!tiles || !tiles.length) return null;           // rien à montrer : la section disparaît
  const [first, ...rest] = tiles;
  const Tile = ({ t, hero }) => (
    <Link to={t.to} className={'nt' + (hero ? ' hero' : '')}>
      {t.img}
      <span className="shade" />
      <span className={'nt-tag' + (t.hot ? ' hot' : '')}>{t.tag}</span>
      <div className="nt-t"><b>{t.title}</b><small>{t.sub}</small></div>
    </Link>
  );
  return (
    <>
      <div className="sec px"><h3>Actualités</h3><Link to="/news">Tout voir</Link></div>
      <div className="news-home px">
        <Tile t={first} hero />
        {rest.slice(0, 4).map((t) => <Tile key={t.key} t={t} />)}
      </div>
    </>
  );
}
