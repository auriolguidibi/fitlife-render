import { useEffect, useRef } from 'react';

/* Démonstrations animées générées par le code : un personnage filaire qui répète le mouvement.
   Chaque mouvement = deux poses (A, B) entre lesquelles on interpole en boucle.
   Points : hd tête, s épaules, h hanche, eL/hL coude et main gauche, eR/hR droite, kL/fL genou et pied gauche, kR/fR droite. */
const P = (hd, s, h, eL, hL, eR, hR, kL, fL, kR, fR) => ({ hd, s, h, eL, hL, eR, hR, kL, fL, kR, fR });
const KEYS = ['hd', 's', 'h', 'eL', 'hL', 'eR', 'hR', 'kL', 'fL', 'kR', 'fR'];

const STAND = P([100, 38], [100, 58], [100, 104], [86, 80], [82, 102], [114, 80], [118, 102], [94, 142], [92, 180], [106, 142], [108, 180]);

export const MOVES = {
  squat: { label: 'Squat', period: 2.2,
    a: STAND,
    b: P([96, 74], [96, 94], [88, 132], [112, 100], [132, 94], [120, 100], [138, 96], [128, 140], [104, 180], [138, 140], [118, 180]) },
  lunge: { label: 'Fentes', period: 2.4,
    a: P([100, 38], [100, 58], [100, 104], [86, 80], [82, 102], [114, 80], [118, 102], [96, 142], [80, 180], [104, 142], [124, 180]),
    b: P([100, 56], [100, 76], [100, 122], [86, 96], [82, 116], [114, 96], [118, 116], [134, 138], [136, 180], [74, 162], [52, 180]) },
  jack: { label: 'Jumping jacks', period: 1.0,
    a: P([100, 38], [100, 58], [100, 104], [88, 82], [84, 104], [112, 82], [116, 104], [95, 142], [94, 180], [105, 142], [106, 180]),
    b: P([100, 30], [100, 50], [100, 96], [122, 40], [136, 14], [78, 40], [64, 14], [128, 138], [140, 172], [72, 138], [60, 172]) },
  push: { label: 'Pompes', period: 1.8, ground: 172,
    a: P([34, 96], [50, 108], [112, 126], [52, 138], [52, 168], [52, 138], [52, 168], [142, 146], [176, 168], [142, 146], [176, 168]),
    b: P([34, 134], [50, 144], [112, 150], [74, 150], [52, 168], [74, 150], [52, 168], [142, 160], [176, 168], [142, 160], [176, 168]) },
  plank: { label: 'Gainage', period: 1.4, ground: 172,
    a: P([34, 112], [50, 124], [112, 132], [50, 150], [50, 168], [50, 150], [50, 168], [145, 150], [178, 168], [150, 156], [178, 168]),
    b: P([34, 112], [50, 124], [112, 132], [50, 150], [50, 168], [50, 150], [50, 168], [145, 152], [178, 168], [96, 150], [118, 162]) },
  crunch: { label: 'Abdominaux', period: 2.0, ground: 176,
    a: P([36, 160], [54, 166], [108, 170], [66, 150], [80, 140], [66, 150], [80, 140], [136, 128], [166, 170], [136, 128], [166, 170]),
    b: P([86, 122], [70, 140], [108, 170], [100, 130], [128, 126], [100, 130], [128, 126], [136, 128], [166, 170], [136, 128], [166, 170]) },
  run: { label: 'Course', period: 0.7, bounce: 6,
    a: P([104, 38], [102, 58], [98, 104], [120, 76], [138, 90], [84, 80], [66, 96], [122, 126], [104, 152], [78, 140], [60, 164]),
    b: P([104, 38], [102, 58], [98, 104], [84, 80], [66, 96], [120, 76], [138, 90], [78, 140], [60, 164], [122, 126], [104, 152]) },
  walk: { label: 'Marche', period: 1.2,
    a: P([102, 38], [101, 58], [99, 104], [112, 80], [122, 98], [90, 80], [80, 100], [110, 142], [118, 180], [92, 142], [76, 180]),
    b: P([102, 38], [101, 58], [99, 104], [90, 80], [80, 100], [112, 80], [122, 98], [92, 142], [76, 180], [110, 142], [118, 180]) },
  box: { label: 'Boxe', period: 0.9,
    a: P([104, 40], [102, 60], [98, 106], [124, 72], [150, 62], [112, 84], [124, 66], [112, 142], [118, 180], [86, 142], [70, 180]),
    b: P([104, 40], [102, 60], [98, 106], [112, 84], [124, 66], [124, 72], [152, 62], [112, 142], [118, 180], [86, 142], [70, 180]) },
  curl: { label: 'Haltères', period: 1.8, weights: true,
    a: STAND,
    b: P([100, 38], [100, 58], [100, 104], [84, 84], [82, 56], [116, 84], [118, 56], [94, 142], [92, 180], [106, 142], [108, 180]) },
  press: { label: 'Développé', period: 1.9, weights: true,
    a: P([100, 38], [100, 58], [100, 104], [76, 66], [78, 40], [124, 66], [122, 40], [94, 142], [92, 180], [106, 142], [108, 180]),
    b: P([100, 38], [100, 58], [100, 104], [82, 38], [84, 8], [118, 38], [116, 8], [94, 142], [92, 180], [106, 142], [108, 180]) },
  stretch: { label: 'Étirements', period: 3.2,
    a: P([100, 40], [100, 60], [100, 106], [92, 36], [100, 10], [108, 36], [100, 10], [94, 144], [92, 180], [106, 144], [108, 180]),
    b: P([128, 50], [112, 62], [96, 106], [128, 34], [150, 20], [136, 34], [150, 20], [90, 144], [88, 180], [104, 144], [106, 180]) },
  fold: { label: 'Mobilité', period: 3.4,
    a: P([100, 38], [100, 58], [100, 104], [96, 38], [100, 10], [104, 38], [100, 10], [94, 142], [92, 180], [106, 142], [108, 180]),
    b: P([138, 126], [124, 104], [92, 104], [118, 124], [118, 164], [128, 124], [128, 164], [94, 142], [92, 180], [106, 142], [108, 180]) },
  yoga: { label: 'Yoga', period: 3.6,
    a: P([100, 30], [100, 52], [100, 100], [92, 30], [100, 6], [108, 30], [100, 6], [100, 142], [100, 180], [100, 142], [100, 180]),
    b: P([100, 46], [100, 66], [100, 108], [72, 60], [38, 56], [128, 60], [162, 56], [76, 144], [48, 176], [124, 144], [152, 176]) },
  breathe: { label: 'Respiration', period: 4.6, sit: true,
    a: P([100, 70], [100, 92], [100, 140], [84, 116], [84, 140], [116, 116], [116, 140], [66, 150], [112, 164], [134, 150], [88, 164]),
    b: P([100, 66], [100, 87], [100, 138], [80, 112], [86, 138], [120, 112], [114, 138], [66, 150], [112, 164], [134, 150], [88, 164]) },
  burpee: { label: 'Burpees', period: 1.6,
    a: P([100, 26], [100, 46], [100, 92], [92, 22], [100, 0], [108, 22], [100, 0], [94, 136], [92, 172], [106, 136], [108, 172]),
    b: P([40, 112], [56, 124], [110, 132], [58, 152], [58, 172], [58, 152], [58, 172], [146, 154], [178, 172], [146, 154], [178, 172]) },
};

/* mot-clé (français / anglais) → mouvement ; le premier qui correspond l'emporte */
const RULES = [
  [/pompe|push.?up|traction|dips?/i, 'push'],
  [/burpee/i, 'burpee'],
  [/gainage|planche|plank|mountain|grimpeur/i, 'plank'],
  [/abdo|crunch|sit.?up|relev[eé] de (buste|jambe)|core|ventre/i, 'crunch'],
  [/fente|lunge|d[eé]coup[eé]/i, 'lunge'],
  [/squat|chaise|cuisse|jambe|leg|fessier|glute|pont/i, 'squat'],
  [/jumping|jack|corde|saut|jump|skip|polichinelle/i, 'jack'],
  [/boxe|boxing|punch|direct|crochet|shadow|combat|sac de frappe/i, 'box'],
  [/d[eé]velopp|press|[eé]paule|shoulder|overhead/i, 'press'],
  [/curl|biceps|halt[eè]re|dumbbell|poids|muscu|force|renfo|soulev|row|tirage|triceps|dos\b|back/i, 'curl'],
  [/respir|breath|m[eé]ditat|relax|zen|calme|pleine conscience|sommeil/i, 'breathe'],
  [/yoga|salutation|guerrier|arbre|posture|asana|pilates/i, 'yoga'],
  [/mobilit|rotation|flexion|t[eê]te|nuque|cou\b/i, 'fold'],
  [/[eé]tir|stretch|souplesse|assouplis|d[eé]tente|r[eé]cup/i, 'stretch'],
  [/marche|walk|rando|hike|randonn/i, 'walk'],
  [/cours|run|jog|footing|sprint|cardio|hiit|endurance|trot|fractionn/i, 'run'],
];

/** Mouvement qui correspond le mieux à un texte (nom d'exercice, de séance, d'activité…) */
export function moveFor(...texts) {
  const s = texts.filter(Boolean).join(' ');
  for (const [re, m] of RULES) if (re.test(s)) return m;
  return null;
}
export const ACTIVITY_MOVE = { walk: 'walk', hike: 'walk', jog: 'run', run: 'run' };

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => { const o = {}; for (const k of KEYS) o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)]; return o; };
const line = (...pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/* écrit directement dans le DOM à chaque image : pas de rendu React 60 fois par seconde */
function draw(g, pose, move, ground, bob) {
  const p = {}; for (const k of KEYS) p[k] = [pose[k][0], pose[k][1] + bob];
  const set = (id, v) => { const el = g.querySelector(`[data-p="${id}"]`); if (el) el.setAttribute('d', v); };
  set('back', line(p.s, p.h));
  set('armL', line(p.s, p.eL, p.hL));
  set('armR', line(p.s, p.eR, p.hR));
  set('legL', line(p.h, p.kL, p.fL));
  set('legR', line(p.h, p.kR, p.fR));
  const head = g.querySelector('[data-p="head"]');
  head.setAttribute('cx', p.hd[0]); head.setAttribute('cy', p.hd[1]);
  const sh = g.querySelector('[data-p="shadow"]');
  sh.setAttribute('cx', (p.fL[0] + p.fR[0]) / 2 || 100);
  if (move.weights) {
    for (const [id, h] of [['wL', p.hL], ['wR', p.hR]]) { g.querySelector(`[data-p="${id}"]`).setAttribute('d', line([h[0] - 9, h[1]], [h[0] + 9, h[1]])); }
  }
}

export default function ExerciseAnim({ move = 'squat', play = true, label, className = 'xanim', compact = false }) {
  const key = MOVES[move] ? move : 'squat';
  const mv = MOVES[key];
  const ref = useRef(null);

  useEffect(() => {
    const g = ref.current;
    if (!g) return undefined;
    const ground = mv.ground || 180;
    let raf, last = performance.now(), t = 0;
    const frame = (now) => {
      if (play) t += (now - last) / 1000;
      last = now;
      const ph = (t % mv.period) / mv.period;
      let k = (1 - Math.cos(ph * 2 * Math.PI)) / 2;          // 0 → 1 → 0, lissé
      const bob = mv.bounce ? -Math.abs(Math.sin(ph * 2 * Math.PI)) * mv.bounce : 0;
      draw(g, mix(mv.a, mv.b, k), mv, ground, bob);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [key, play, mv]);

  const ground = mv.ground || 180;
  return (
    <div className={className} role="img" aria-label={`Démonstration animée : ${label || mv.label}`}>
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" ref={ref}>
        <defs>
          <radialGradient id={`xg-${key}`} cx="50%" cy="46%" r="60%"><stop offset="0" stopColor="var(--lime)" stopOpacity=".28" /><stop offset="1" stopColor="var(--lime)" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill={`url(#xg-${key})`} className="xa-glow" />
        <line x1="14" y1={ground + 4} x2="186" y2={ground + 4} className="xa-ground" />
        <ellipse data-p="shadow" cx="100" cy={ground + 4} rx="34" ry="3.5" className="xa-shadow" />
        <path data-p="legL" className="xa-limb xa-back" /><path data-p="armL" className="xa-limb xa-back" />
        <path data-p="back" className="xa-limb xa-body" />
        <path data-p="legR" className="xa-limb" /><path data-p="armR" className="xa-limb" />
        {mv.weights && <><path data-p="wL" className="xa-weight" /><path data-p="wR" className="xa-weight" /></>}
        <circle data-p="head" r="12" className="xa-head" />
      </svg>
      {!compact && <span className="xa-tag">{label || mv.label}</span>}
    </div>
  );
}
