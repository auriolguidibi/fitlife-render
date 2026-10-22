const BASE = import.meta.env.BASE_URL;

/* Écran de chargement de marque : même balisage que celui d'index.html (affiché avant que React ne démarre). */
export default function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite" aria-label="Chargement">
      <div className="splash-in">
        <div className="splash-logo"><img src={`${BASE}logo.png`} alt="" width="76" height="76" /></div>
        <div className="splash-word">Fit<span>Life</span></div>
        <div className="splash-bar" aria-hidden="true"><i /></div>
      </div>
    </div>
  );
}
