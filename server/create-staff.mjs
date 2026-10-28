/* Crée (ou promeut) les comptes de l'équipe : administrateurs et coachs.
   Usage :  npm run staff -- role:email:Nom [role:email:Nom ...]
   Exemple : npm run staff -- admin:auriol@exemple.com:Auriol coach:may@exemple.com:May
   Les mots de passe sont générés ici et affichés une seule fois ; changez-les ensuite dans « Mon compte ».
   Un compte déjà existant garde son mot de passe : seul son rôle est mis à jour (ajoutez --reset pour en générer un nouveau). */
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import dns from 'node:dns';
import { MongoClient } from 'mongodb';

dns.setServers(['8.8.8.8', '1.1.1.1']);   // certains réseaux refusent la résolution SRV de MongoDB Atlas

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI est absent : lancez la commande depuis le dossier du projet (le fichier .env est lu).'); process.exit(1); }

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const specs = args.filter((a) => !a.startsWith('--')).map((a) => { const [role, email, ...n] = a.split(':'); return { role, email: (email || '').trim().toLowerCase(), name: n.join(':').trim() }; });
if (!specs.length) { console.error('Aucun compte indiqué. Exemple : npm run staff -- admin:auriol@exemple.com:Auriol coach:may@exemple.com:May'); process.exit(1); }

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const ALPHA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const password = () => Array.from({ length: 14 }, () => ALPHA[randomInt(ALPHA.length)]).join('');

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const users = client.db(process.env.MONGODB_DB || 'fitpulse').collection('users');

const rows = [];
for (const s of specs) {
  if (!['admin', 'coach'].includes(s.role) || !EMAIL.test(s.email)) { console.error(`Ignoré (rôle admin ou coach, e-mail valide requis) : ${s.role}:${s.email}`); continue; }
  const found = await users.findOne({ email: s.email });
  if (found) {
    const set = { role: s.role, onboarded: true };
    let pw = '(inchangé)';
    if (reset) { pw = password(); set.password_hash = await bcrypt.hash(pw, 10); }
    await users.updateOne({ _id: found._id }, { $set: set });
    rows.push([s.role, s.email, pw, 'compte existant mis à jour']);
  } else {
    const pw = password();
    await users.insertOne({ name: s.name || s.email.split('@')[0], email: s.email, password_hash: await bcrypt.hash(pw, 10), created_at: Date.now(), onboarded: true, daily_goal: 300, theme: 'lime', goals: [], role: s.role });
    rows.push([s.role, s.email, pw, 'compte créé']);
  }
}
await client.close();
console.log('\nrôle   | e-mail | mot de passe | état');
for (const r of rows) console.log(r.join(' | '));
console.log('\nConservez ces mots de passe maintenant : ils ne seront plus affichés.');
