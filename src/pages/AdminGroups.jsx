import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';
import Icon from '../components/Icon';
import { Empty, SearchBox } from '../components/ui';
import { dateLabel, timeLabel } from '../components/ActivityBits';
import { AdminShell } from './Admin';

const copy = async (text, ok, notify) => {
  try { await navigator.clipboard.writeText(text); notify(ok); } catch { notify('Copie impossible : sélectionne le texte à la main'); }
};
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* ---------- création / modification : choisir les membres ---------- */
function GroupForm({ group, members, onDone, onCancel }) {
  const { notify } = useStore();
  const [name, setName] = useState(group?.name ?? '');
  const [picked, setPicked] = useState(() => new Map((members ?? []).map((m) => [m.id, m])));
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stamp = useRef(0);

  useEffect(() => {
    const n = ++stamp.current;
    const h = setTimeout(() => { api.admin.users(q.trim()).then((r) => { if (n === stamp.current) setList(r.users.filter((u) => !u.admin && !u.coach)); }).catch((e) => setError(e.message)); }, q ? 250 : 0);
    return () => clearTimeout(h);
  }, [q]);

  const toggle = (u) => setPicked((p) => { const m = new Map(p); if (m.has(u.id)) m.delete(u.id); else m.set(u.id, u); return m; });
  const addAllShown = () => setPicked((p) => { const m = new Map(p); (list ?? []).forEach((u) => m.set(u.id, u)); return m; });

  const submit = async (e, all = false) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = all ? { name, all: true } : { name, memberIds: [...picked.keys()] };
      await api.admin.save('groups', group?.id, body);
      notify('Groupe enregistré'); onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <form className="card admin-form" onSubmit={submit} noValidate>
      <div className="card-h"><b>{group ? 'Modifier le groupe' : 'Nouveau groupe'}</b></div>
      <div className="fld"><label htmlFor="g-n">Nom du groupe</label><input id="g-n" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="ex. Séance du samedi, Tous les inscrits…" /></div>
      <div className="grp-pick">
        <div className="grp-head"><b>Membres ({picked.size})</b><div><button type="button" className="mini-btn" onClick={addAllShown}>Ajouter les résultats</button> <button type="button" className="mini-btn" onClick={() => setPicked(new Map())}>Vider</button></div></div>
        <SearchBox value={q} onChange={setQ} placeholder="Rechercher un nom, e-mail ou numéro" />
        <div className="grp-list" role="group" aria-label="Inscrits">
          {!list ? <div className="skeleton" style={{ height: 60, borderRadius: 12 }} /> : list.length ? list.map((u) => (
            <label key={u.id} className={'grp-u' + (picked.has(u.id) ? ' on' : '')}>
              <input type="checkbox" checked={picked.has(u.id)} onChange={() => toggle(u)} />
              <span><b>{u.name}</b><small>{u.email}{u.phone ? ` · ${u.phone}` : ' · numéro non renseigné'}</small></span>
            </label>
          )) : <p className="muted">Aucun inscrit ne correspond.</p>}
        </div>
      </div>
      {error && <div className="form-err" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Enregistrement…' : 'Enregistrer le groupe'}</button>
      {!group && <button className="btn ghost" type="button" disabled={busy || name.trim().length < 2} onClick={(e) => submit(e, true)}>Créer avec tous les inscrits</button>}
      <button className="btn ghost" type="button" onClick={onCancel} disabled={busy}>Annuler</button>
    </form>
  );
}

/* ---------- détail : membres avec coordonnées, envoi d'informations ---------- */
function GroupDetail({ id, onBack, onEdit, onDeleted }) {
  const { notify } = useStore();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setError(''); api.admin.group(id).then(setD).catch((e) => setError(e.message)); }, [id]);
  useEffect(load, [load]);

  const emails = useMemo(() => (d?.members ?? []).map((m) => m.email), [d]);
  const phones = useMemo(() => (d?.members ?? []).map((m) => m.phone).filter(Boolean), [d]);

  const send = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api.admin.sendGroupMessage(id, text); notify(`Information envoyée à ${r.recipients} membre${r.recipients > 1 ? 's' : ''}`); setText(''); load(); } catch (err) { notify(err.message); }
    setBusy(false);
  };
  const exportCsv = () => {
    const rows = [['Nom', 'E-mail', 'Téléphone'], ...d.members.map((m) => [m.name, m.email, m.phone])];
    const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `groupe-${d.group.name.replace(/[^\w-]+/g, '-').toLowerCase()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const remove = async () => {
    if (!window.confirm(`Supprimer le groupe « ${d.group.name} » ? Les comptes ne sont pas supprimés.`)) return;
    try { await api.admin.remove('groups', id); notify('Groupe supprimé'); onDeleted(); } catch (e) { notify(e.message); }
  };

  if (error) return <div className="state-box center" role="alert"><b>Impossible de charger le groupe</b><p>{error}</p><button className="btn" onClick={load}>Réessayer</button></div>;
  if (!d) return <div className="skeleton" style={{ height: 200, borderRadius: 16 }} aria-busy="true" />;
  const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(d.group.name)}`;
  return (
    <>
      <button className="link-btn left" onClick={onBack}>‹ Tous les groupes</button>
      <div className="grp-title"><h3>{d.group.name}</h3><span className="best">{d.group.count} membre{d.group.count > 1 ? 's' : ''}</span></div>

      <form className="card" onSubmit={send}>
        <div className="card-h"><b>Envoyer une information au groupe</b></div>
        <div className="fld"><textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Nouvelle séance, changement d'horaire, annonce…" aria-label="Information" /></div>
        <p className="muted" style={{ margin: '0 0 8px' }}>Chaque membre la reçoit dans ses notifications sur FitLife.</p>
        <button className="btn" type="submit" disabled={busy || text.trim().length < 2}>{busy ? 'Envoi…' : 'Envoyer à tout le groupe'}</button>
      </form>

      <div className="card">
        <div className="card-h"><b>Contacter autrement</b></div>
        <div className="grp-actions">
          <button className="btn ghost small" onClick={() => copy(emails.join(', '), `${emails.length} e-mails copiés`, notify)} disabled={!emails.length}>Copier les e-mails</button>
          <button className="btn ghost small" onClick={() => copy(phones.join(', '), `${phones.length} numéros copiés`, notify)} disabled={!phones.length}>Copier les numéros</button>
          <a className={'btn ghost small' + (emails.length ? '' : ' off')} href={emails.length ? mailto : undefined}>Écrire à tous (e-mail)</a>
          <button className="btn ghost small" onClick={exportCsv} disabled={!d.members.length}>Exporter en CSV</button>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><b>Membres</b><button className="mini-btn" onClick={() => onEdit(d)}>Modifier</button></div>
        {d.members.length ? d.members.map((m) => (
          <div key={m.id} className="grp-m"><b>{m.name}</b><small>{m.email}</small><small>{m.phone ? <a href={`tel:${m.phone}`}>📞 {m.phone}</a> : 'Numéro non renseigné'}</small></div>
        )) : <p className="muted">Ce groupe est vide. Ajoute des membres avec « Modifier ».</p>}
      </div>

      {d.messages.length > 0 && (
        <div className="card">
          <div className="card-h"><b>Informations envoyées</b></div>
          {d.messages.map((m) => <div key={m.id} className="grp-msg"><small>{dateLabel(m.at)} · {timeLabel(m.at)}</small><p>{m.text}</p></div>)}
        </div>
      )}
      <button className="btn ghost danger" onClick={remove}>Supprimer ce groupe</button>
    </>
  );
}

export function AdminGroups() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState({ kind: 'list' });   // list | new | edit | detail
  const load = useCallback(() => { setError(''); api.admin.groups().then((r) => setGroups(r.groups)).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  const back = () => { setView({ kind: 'list' }); load(); };

  return (
    <AdminShell title="Groupes" sub="Regroupe des inscrits (e-mail et numéro) pour leur envoyer des informations" back="/admin/users">
      {view.kind === 'new' && <GroupForm onDone={back} onCancel={() => setView({ kind: 'list' })} />}
      {view.kind === 'edit' && <GroupForm group={view.group} members={view.members} onDone={() => setView({ kind: 'detail', id: view.group.id })} onCancel={() => setView({ kind: 'detail', id: view.group.id })} />}
      {view.kind === 'detail' && <GroupDetail id={view.id} onBack={back} onDeleted={back} onEdit={(d) => setView({ kind: 'edit', group: d.group, members: d.members })} />}
      {view.kind === 'list' && (
        error ? <div className="state-box center" role="alert"><b>Impossible de charger les groupes</b><p>{error}</p><button className="btn" onClick={load}>Réessayer</button></div> : (
          <>
            <button className="btn" onClick={() => setView({ kind: 'new' })}><Icon n="plus" /> Créer un groupe</button>
            <div className="lst grid" style={{ marginTop: 14 }}>
              {!groups ? <div className="row skeleton" /> : groups.length ? groups.map((g) => (
                <button key={g.id} className="row grp-row" onClick={() => setView({ kind: 'detail', id: g.id })}>
                  <i className="grp-ic" aria-hidden="true">👥</i>
                  <div className="t"><b>{g.name}</b><small>{g.count} membre{g.count > 1 ? 's' : ''}{g.messages ? ` · ${g.messages} information${g.messages > 1 ? 's' : ''} envoyée${g.messages > 1 ? 's' : ''}` : ''}</small>{g.lastText && <small>Dernière : {g.lastText}</small>}</div>
                </button>
              )) : <Empty>Aucun groupe pour le moment.<br />Crée-en un pour contacter tes inscrits.</Empty>}
            </div>
            <Link to="/admin/users" className="link-btn" style={{ display: 'block', textAlign: 'center', marginTop: 14 }}>Voir tous les comptes</Link>
          </>
        )
      )}
    </AdminShell>
  );
}
