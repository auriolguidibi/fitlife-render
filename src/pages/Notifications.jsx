import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BackBtn, Empty } from '../components/ui';
import Icon from '../components/Icon';
import { dateLabel, timeLabel } from '../components/ActivityBits';
import { markSeen, useNotifs } from '../lib/notifs';

const META = { live: ['broadcast', 'Live'], menu: ['utensils', 'Suivi alimentaire'], challenge: ['trophy', 'Défi'], event: ['calendar', 'Événement'], info: ['megaphone', 'Information'] };
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`;
  return dateLabel(t);
};

/* Centre de notifications : l'utilisateur y retrouve les lives à rejoindre, les menus du jour, les défis et événements */
export default function Notifications() {
  const { items, reload } = useNotifs();
  useEffect(() => { if (items?.length) markSeen(items.map((n) => n.id)); }, [items]);

  return (
    <section className="page">
      <div className="topbar"><BackBtn to="/home" /><h2>Notifications</h2><button className="icon-btn" onClick={reload} aria-label="Actualiser"><Icon n="next" /></button></div>
      <div className="px notif-list" aria-live="polite">
        {!items ? <div aria-busy="true" aria-label="Chargement"><div className="skeleton" style={{ height: 96, borderRadius: 18 }} /></div>
          : items.length ? items.map((n) => {
            const [ico, label] = META[n.type] ?? ['bell', 'Info'];
            const live = n.type === 'live';
            const on = live && n.state === 'live';
            return (
              <Link key={n.id} to={n.to} className={'notif' + (n.type === 'info' ? ' info' : '') + (live ? ' is-live' : '') + (on ? ' on' : '')}>
                <i className="nf-ic" aria-hidden="true"><Icon n={ico} /></i>
                <div className="nf-t">
                  <small>{on ? 'EN DIRECT MAINTENANT' : label}{!live && ` · ${n.type === 'event' ? `le ${dateLabel(n.at)} à ${timeLabel(n.at)}` : ago(n.at)}`}</small>
                  <b>{n.title}</b>
                  <span>{live ? (on ? `${n.text} est en direct` : `${n.text} · ${dateLabel(n.at)} à ${timeLabel(n.at)}`) : n.text}</span>
                </div>
                {live && <span className="nf-join">{on ? 'Rejoindre' : 'Voir'}</span>}
              </Link>
            );
          }) : <Empty>Rien de nouveau pour le moment.<br />Les lives, menus du jour et nouveaux défis apparaîtront ici.</Empty>}
      </div>
    </section>
  );
}
