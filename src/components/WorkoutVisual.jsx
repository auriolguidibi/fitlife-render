import { Vid } from './Media';
import ExerciseAnim, { moveFor } from './ExerciseAnim';

/* Les vidéos fournies sont génériques : on ne les montre que si elles correspondent vraiment à la séance.
   Sinon, une démonstration animée est générée à partir des exercices. */
const FILE_TOPICS = [
  [/boxing-(man|woman)/, /boxe|boxing|punch|shadow|combat/i],
  [/yoga/, /yoga|salutation|posture|pilates/i],
  [/meditat/, /m[eé]ditat|respir|relax|zen|calme/i],
  [/stretch/, /[eé]tir|stretch|souplesse|mobilit|r[eé]cup/i],
  [/run/, /cours|run|jog|footing|sprint|cardio|hiit|endurance/i],
  [/back/, /\bdos\b|back|gainage|lombaire/i],
  [/weights/, /muscu|poids|halt[eè]re|force|renfo|biceps|triceps|pectoraux|[eé]paule/i],
];

const textOf = (w) => [w.title, w.desc, w.description, w.course?.name, ...(w.exercises || []).map((e) => e.name)].filter(Boolean).join(' ');

/** Vrai si la vidéo-fichier de la séance parle bien de la même chose que la séance */
export function videoMatches(w) {
  if (!w.video) return false;
  if (/^https?:\/\//i.test(w.video) && !/\.(mp4|webm|mov)(\?|$)/i.test(w.video)) return true;   // lien YouTube… choisi par l'admin
  const rule = FILE_TOPICS.find(([f]) => f.test(w.video));
  if (!rule) return true;                                                                      // fichier ajouté par l'admin : on lui fait confiance
  return rule[1].test(textOf(w));
}

/** Mouvement qui représente la séance */
export function workoutMove(w) {
  const first = (w.exercises || []).map((e) => moveFor(e.name)).find(Boolean);
  return first || moveFor(w.title, w.desc, w.description, w.course?.name) || 'jack';
}

/** Zone visuelle d'une séance : vidéo adaptée si elle existe, sinon démonstration animée */
export default function WorkoutVisual({ w, play = true, move, label, pos }) {
  if (!move && videoMatches(w) && w.video) return <Vid src={w.video} poster={w.photo} play={play} pos={pos} />;
  return (
    <div className="xa-stage">
      <ExerciseAnim move={move || workoutMove(w)} play={play} label={label} />
    </div>
  );
}
