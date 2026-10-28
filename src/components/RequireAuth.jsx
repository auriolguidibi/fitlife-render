import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useStore } from '../store';

/* Réserve une page aux comptes connectés qui ont choisi leurs objectifs. */
export default function RequireAuth({ children, fallback = null }) {
  const { user, loading } = useAuth();
  if (loading) return fallback;
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.admin) return <Navigate to="/admin" replace />;   // l'administrateur n'a pas d'espace client
  if (user.coach) return <Navigate to="/coach" replace />;   // le coach non plus : il a son propre espace
  if (!user.onboarded) return <Navigate to="/goals" replace />;
  return children;
}

/* Réserve une page aux administrateurs (le serveur refuse de toute façon les requêtes des autres). */
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/welcome" replace />;
  return user.admin ? children : <Navigate to={user.onboarded ? '/home' : '/goals'} replace />;
}

/* Réserve une page aux coachs (les administrateurs ont leur propre espace). */
export function RequireCoach({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.admin) return <Navigate to="/admin" replace />;
  return user.coach ? children : <Navigate to={user.onboarded ? '/home' : '/goals'} replace />;
}

/* Aligne les favoris locaux sur les marqueurs `fav` renvoyés par le serveur. */
export function useSyncFavs(workouts) {
  const { dispatch } = useStore();
  // clé stable : l'effet ne se relance que si les identifiants ou les marqueurs changent
  // (les pages passent un nouveau tableau à chaque rendu, ce qui bouclait à l'infini)
  const key = workouts?.length ? workouts.map((w) => `${w.id}:${w.fav ? 1 : 0}`).join('|') : '';
  useEffect(() => {
    if (!key) return;
    const list = key.split('|').map((k) => k.split(':'));
    dispatch({ type: 'syncFavs', on: list.filter((x) => x[1] === '1').map((x) => x[0]), off: list.filter((x) => x[1] === '0').map((x) => x[0]) });
  }, [key, dispatch]);
}
