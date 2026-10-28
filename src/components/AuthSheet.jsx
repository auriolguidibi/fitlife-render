import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import AuthForm from './AuthForm';

/* Fenêtre de connexion / inscription (mobile) */
export default function AuthSheet({ initialMode, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const box = useRef(null);

  // Échap, verrouillage du défilement, piège à focus
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab' && box.current) {
        const els = [...box.current.querySelectorAll('button,input,[href]')].filter((x) => !x.disabled);
        if (!els.length) return;
        const a = els[0], z = els[els.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [busy, onClose]);

  return (
    <div className="sheet-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Connexion ou inscription" ref={box}>
        <button className="x" aria-label="Fermer" onClick={onClose} disabled={busy}><Icon n="close" /></button>
        <AuthForm initialMode={initialMode} onDone={onDone} onBusy={setBusy} />
      </div>
    </div>
  );
}
