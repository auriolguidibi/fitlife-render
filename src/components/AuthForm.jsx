import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../auth';
import Icon from './Icon';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const phoneOk = (s) => /^\+?[\d\s().-]{6,24}$/.test(s.trim()) && s.replace(/\D/g, '').length >= 6 && s.replace(/\D/g, '').length <= 15;

function validate(mode, v) {
  const f = {};
  if (mode === 'register' && (!v.name.trim() || v.name.trim().length > 40)) f.name = 'Entre ton nom (40 caractères maximum).';
  if (mode === 'register' ? !EMAIL.test(v.email.trim()) : !v.email.trim()) f.email = mode === 'register' ? 'Entre une adresse e-mail valide.' : 'Entre ton e-mail ou ton identifiant.';
  if (mode === 'register' && !phoneOk(v.phone)) f.phone = 'Entre un numéro de téléphone valide (ex. +225 07 00 00 00 00).';
  if (mode === 'register' ? v.password.length < 8 : !v.password) f.password = mode === 'register' ? 'Utilise au moins 8 caractères.' : 'Entre ton mot de passe.';
  return f;
}

/* force du mot de passe : 0 à 4 */
const strength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (p.length >= 12 || /[^\w\s]/.test(p)) s++;
  return p ? Math.max(1, s) : 0;
};
const STRENGTH = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'];

function Field({ id, icon, label, error, hint, right, children }) {
  return (
    <div className={'af-f' + (error ? ' bad' : '')}>
      <label htmlFor={id}>{label}</label>
      <div className="af-in">
        <Icon n={icon} className="af-ic" />
        {children}
        {right}
      </div>
      {error ? <small id={id + '-e'} role="alert" className="af-err">{error}</small> : hint ? <small className="af-hint">{hint}</small> : null}
    </div>
  );
}

/* Connexion / inscription : utilisé dans la fenêtre du mobile et directement dans la page sur ordinateur */
export default function AuthForm({ initialMode = 'register', onDone, onBusy, inline }) {
  const { register, login } = useAuth();
  const uid = useId();
  const [mode, setMode] = useState(initialMode);
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '' });
  const [errs, setErrs] = useState({});
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const root = useRef(null);
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); if (errs[k]) setErrs({ ...errs, [k]: undefined }); };
  const reg = mode === 'register';
  const score = strength(v.password);

  useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);
  useEffect(() => { if (!inline) root.current?.querySelector('input')?.focus(); }, [mode, inline]);

  const switchMode = (m) => { setMode(m); setErrs({}); setFormErr(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = validate(mode, v);
    setErrs(f); setFormErr('');
    if (Object.keys(f).length) { root.current?.querySelector('.bad input')?.focus(); return; }
    setBusy(true);
    try {
      const u = reg
        ? await register({ name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), password: v.password })
        : await login({ email: v.email.trim(), password: v.password });
      onDone(u);
    } catch (err) {
      setErrs(err.fields || {});
      setFormErr(err.fields && Object.keys(err.fields).length ? '' : err.message);
      setBusy(false);
      requestAnimationFrame(() => root.current?.querySelector('.bad input')?.focus());
    }
  };

  return (
    <div className={'af' + (inline ? ' af-inline' : '')} ref={root}>
      <h2 id={uid + 't'} className="af-title">{reg ? 'Crée ton compte' : 'Content de te revoir'}</h2>
      <p className="af-sub">{reg ? 'Rejoins FitLife en moins d\'une minute : séances, lives et menus du jour.' : 'Connecte-toi pour reprendre là où tu t\'es arrêté.'}</p>

      <div className="af-tabs" role="tablist">
        <button role="tab" aria-selected={reg} className={reg ? 'on' : ''} onClick={() => switchMode('register')} type="button">Inscription</button>
        <button role="tab" aria-selected={!reg} className={!reg ? 'on' : ''} onClick={() => switchMode('login')} type="button">Connexion</button>
      </div>

      <form onSubmit={submit} noValidate>
        {reg && (
          <Field id={uid + 'n'} icon="user" label="Nom" error={errs.name}>
            <input id={uid + 'n'} value={v.name} onChange={set('name')} autoComplete="name" maxLength={40} aria-invalid={!!errs.name} placeholder="Ton nom" />
          </Field>
        )}
        <Field id={uid + 'm'} icon="mail" label={reg ? 'E-mail' : 'E-mail ou identifiant'} error={errs.email}>
          <input id={uid + 'm'} type={reg ? 'email' : 'text'} value={v.email} onChange={set('email')} autoComplete={reg ? 'email' : 'username'} inputMode={reg ? 'email' : 'text'} aria-invalid={!!errs.email} placeholder={reg ? 'toi@exemple.com' : 'toi@exemple.com ou identifiant'} />
        </Field>
        {reg && (
          <Field id={uid + 't'} icon="phone" label="Numéro de téléphone" error={errs.phone} hint="Pour te prévenir des lives et des informations importantes">
            <input id={uid + 't'} type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" maxLength={24} aria-invalid={!!errs.phone} placeholder="+225 07 00 00 00 00" />
          </Field>
        )}
        <Field id={uid + 'p'} icon="lock" label="Mot de passe" error={errs.password}
          right={<button type="button" className="af-eye" onClick={() => setShow(!show)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show}>{show ? 'Masquer' : 'Afficher'}</button>}>
          <input id={uid + 'p'} type={show ? 'text' : 'password'} value={v.password} onChange={set('password')} autoComplete={reg ? 'new-password' : 'current-password'} aria-invalid={!!errs.password} placeholder={reg ? 'Au moins 8 caractères' : 'Ton mot de passe'} />
        </Field>
        {reg && v.password && (
          <div className={'af-meter s' + score} aria-live="polite">
            <span><i /><i /><i /><i /></span><small>{STRENGTH[score]}</small>
          </div>
        )}
        {formErr && <div className="form-err" role="alert">{formErr}</div>}
        <button className="af-submit" type="submit" disabled={busy}>{busy ? 'Patiente…' : reg ? 'Créer mon compte' : 'Me connecter'}<Icon n="arrow" /></button>
      </form>

      <p className="af-foot">
        {reg ? <>Déjà un compte ? <button type="button" onClick={() => switchMode('login')}>Me connecter</button></> : <>Pas encore de compte ? <button type="button" onClick={() => switchMode('register')}>Créer mon compte</button></>}
      </p>
    </div>
  );
}
