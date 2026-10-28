import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import MealCard from './MealCard';
import { localDay } from '../pages/Plans';

/* Accueil : le menu du jour publié par les coachs (suivi alimentaire) */
export default function MenuHome() {
  const { user } = useAuth();
  const [plans, setPlans] = useState(null);
  useEffect(() => { api.plans(localDay()).then((r) => setPlans(r.plans)).catch(() => setPlans([])); }, []);
  if (!plans) return null;

  if (!plans.length) {
    // pas de menu : le coach est invité à le publier, les membres ne voient rien de vide
    return user?.coach ? (
      <Link to="/coach" className="menu-cta">
        <i aria-hidden="true">🍽️</i>
        <div><b>Publie le menu du jour</b><small>Tes membres attendent le suivi alimentaire d'aujourd'hui</small></div>
        <em aria-hidden="true">›</em>
      </Link>
    ) : null;
  }
  return (
    <>
      <div className="sec px"><h3>Menu du jour</h3><Link to="/plans">Tous les menus</Link></div>
      <div className="px menu-home">
        <MealCard plan={plans[0]} compact />
        {plans.length > 1 && <Link to="/plans" className="btn ghost small">Voir les {plans.length - 1} autre{plans.length > 2 ? 's' : ''} menu{plans.length > 2 ? 's' : ''}</Link>}
      </div>
    </>
  );
}
