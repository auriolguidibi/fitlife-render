import Avatar from './Avatar';

/* Pictogramme d'un repas d'après son nom */
const mealIcon = (label = '') => {
  const l = label.toLowerCase();
  if (/petit|matin|r[eé]veil/.test(l)) return '🥣';
  if (/collation|encas|snack/.test(l)) return '🍎';
  if (/go[uû]ter|th[eé]|caf[eé]/.test(l)) return '🍌';
  if (/d[eé]jeuner|midi/.test(l)) return '🥗';
  if (/d[iî]ner|soir/.test(l)) return '🍲';
  if (/eau|hydrat/.test(l)) return '💧';
  return '🍽️';
};

/* Menu d'une journée publié par un coach : en-tête coach + chronologie des repas */
export default function MealCard({ plan, day, compact }) {
  const meals = compact ? plan.meals.slice(0, 3) : plan.meals;
  return (
    <article className="meal-card">
      <header className="mc-h">
        <Avatar name={plan.coach.name} src={plan.coach.avatar} />
        <div><b>{plan.coach.name}</b><small>Coach · menu {day || 'du jour'}</small></div>
        <span className="mc-n">{plan.meals.length} {plan.meals.length > 1 ? 'repas' : 'repas'}</span>
      </header>
      <ol className="mc-list">
        {meals.map((m, i) => (
          <li key={i}>
            <i className="mc-ic" aria-hidden="true">{mealIcon(m.label)}</i>
            <div><b>{m.label}</b><p>{m.text}</p></div>
          </li>
        ))}
      </ol>
      {compact && plan.meals.length > 3 && <small className="mc-more">+ {plan.meals.length - 3} autres repas</small>}
    </article>
  );
}
