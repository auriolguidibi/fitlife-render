import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';

/* Informations du compte (nom, e-mail) et mot de passe : pour tous les rôles (client, coach, admin). */
export default function AccountForms() {
  const { user, setUser } = useAuth();
  const { dispatch, notify } = useStore();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [pw, setPw] = useState('');
  const [infoErr, setInfoErr] = useState({});
  const [infoBusy, setInfoBusy] = useState(false);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [pwErr, setPwErr] = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '');

  const saveInfo = async (e) => {
    e.preventDefault();
    setInfoErr({}); setInfoBusy(true);
    try {
      const r = await api.saveProfile({ name, ...(emailChanged ? { email, password: pw } : {}) });
      setUser((u) => ({ ...u, name: r.user.name, email: r.user.email }));
      dispatch({ type: 'hydrate', patch: { name: r.user.name } });
      setName(r.user.name); setEmail(r.user.email); setPw('');
      notify('Informations mises à jour');
    } catch (err) { setInfoErr(err.fields?.name || err.fields?.email || err.fields?.password ? err.fields : { form: err.message }); }
    setInfoBusy(false);
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (next !== again) { setPwErr({ again: 'Les deux mots de passe ne correspondent pas.' }); return; }
    setPwErr({}); setPwBusy(true);
    try {
      await api.changePassword(cur, next);
      setCur(''); setNext(''); setAgain('');
      notify('Mot de passe modifié');
    } catch (err) { setPwErr(err.fields?.current || err.fields?.next ? err.fields : { form: err.message }); }
    setPwBusy(false);
  };

  const Fld = ({ id, label, err, children }) => (
    <div className={'fld' + (err ? ' bad' : '')}><label htmlFor={id}>{label}</label>{children}{err && <small role="alert">{err}</small>}</div>
  );

  return (
    <>
      <form className="card" onSubmit={saveInfo} noValidate>
        <div className="card-h"><b>Mes informations</b></div>
        <Fld id="ai-n" label="Nom" err={infoErr.name}><input id="ai-n" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" /></Fld>
        <Fld id="ai-e" label="Adresse e-mail" err={infoErr.email}><input id="ai-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Fld>
        {emailChanged && <Fld id="ai-p" label="Mot de passe actuel (pour changer d'e-mail)" err={infoErr.password}><input id="ai-p" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Fld>}
        {infoErr.form && <div className="form-err" role="alert">{infoErr.form}</div>}
        <button className="btn small" type="submit" disabled={infoBusy || !name.trim() || (name.trim() === user?.name && !emailChanged)}>{infoBusy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>

      <form className="card" onSubmit={savePw} noValidate>
        <div className="card-h"><b>Mot de passe</b></div>
        <Fld id="ap-c" label="Mot de passe actuel" err={pwErr.current}><input id="ap-c" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Fld>
        <Fld id="ap-n" label="Nouveau mot de passe (8 caractères minimum)" err={pwErr.next}><input id="ap-n" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Fld>
        <Fld id="ap-a" label="Confirme le nouveau mot de passe" err={pwErr.again}><input id="ap-a" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Fld>
        {pwErr.form && <div className="form-err" role="alert">{pwErr.form}</div>}
        <button className="btn small" type="submit" disabled={pwBusy || !cur || !next || !again}>{pwBusy ? 'Modification…' : 'Changer le mot de passe'}</button>
      </form>
    </>
  );
}
