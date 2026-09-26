# C KI KA LA — Hallila Games

Party-game web de classement entre amis, créé avec David, Ariel (Taunille Starque) et Isaac (Craftmine). Cette version reprend la direction artistique du prototype : Jost, logo centré, violet/bleu nuit et rangs S–E colorés.

## Version livrée — v5

Le détail des décisions sur les 23 points du prompt commercial est dans [docs/ANALYSE-PROMPT-V5.md](docs/ANALYSE-PROMPT-V5.md).

- Squads privées : invitations, gestion des membres, historique et statistiques partagés après accord unanime.
- Decks de questions privés, distincts des sets à classer.
- 80 nouvelles questions Premium, Party Pass, Plus mensuel/annuel et packs séparés ; droits partagés avec les invités de l’hôte.
- Stripe Checkout, webhooks signés, portail, remboursement et résiliation implémentés. **Achats fermés jusqu’à configuration du vendeur.** Guide : [docs/PAIEMENTS-V5.md](docs/PAIEMENTS-V5.md).
- Revanche avec les mêmes réglages et une salle commune, accessible sans compte.
- Partage volontaire avec aperçu PNG vertical Story ou tier-list, noms masqués par défaut.
- Souvenirs par question, badges de participation, avis sur les questions et compteurs de revanche côté administration.

### Fonctions du jeu

- Partie réelle de 3 à 12 joueurs, invitation par code et QR, salle d’attente, présence et reconnexion.
- Votes secrets, tier-list par glisser-déposer ou sélection puis clic, classement collectif et bilan final.
- 60 questions originales en trois packs ; question libre ; boîte à thèmes proposée par les joueurs.
- Classement des participants ou de 2 à 12 éléments indépendants, avec sets enregistrés par compte.
- Profil invité sur cet appareil, compte autonome par e-mail/mot de passe, statistiques privées, historique, export et suppression du compte.
- Administration réservée au propriétaire : utilisateurs, e-mails déclarés, parties, bulletins archivés, signalements, suspension et journal des actions.
- Récupération par code privé à usage unique, changement de mot de passe et déconnexion des autres appareils.
- Contrôles d’accès serveur, validation des saisies, limitation des actions, vote unique et transitions atomiques en base.

**Statut : plateforme fonctionnelle avec intégration commerciale non activée.** Aucun paiement ni abonnement réel n’a été ouvert. La validation technique est décrite dans [docs/VALIDATION-V5.md](docs/VALIDATION-V5.md). Le travail avant une ouverture commerciale est décrit dans [docs/LANCEMENT.md](docs/LANCEMENT.md). Les protections implémentées ne constituent pas un audit de sécurité indépendant.

## Règles retenues

L’hôte choisit le pack, 1/3/5/10/15 manches et 45/60/90/120 secondes. Les entrées sont fermées au début ; les participants inscrits peuvent revenir. Chacun classe les autres joueurs (jamais soi-même) ou les éléments du set ; il peut explicitement placer un nom dans « Non classé ». Plusieurs noms peuvent partager un rang.

S vaut 5, A 4, B 3, C 2, D 1, E 0. Le rang mesure combien la question correspond à la personne, pas sa valeur. Le résultat est la moyenne des votes valides reçus, arrondie pour déterminer le rang ; les égalités restent des égalités. Une abstention, un nom non classé ou une absence de vote n’est pas un E. Une question passée par l’hôte ne compte pas dans les moyennes ni dans les votes statistiques. Une partie apparaît dans l’historique quand l’hôte termine son bilan.

## Développement

Node ≥22.13 et pnpm, avec les versions verrouillées dans `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
pnpm test:billing
```

Le test d’intégration charge le Worker compilé et une base D1 jetable dans Miniflare. Il n’accède jamais à la production. Son contrôleur de fixtures existe uniquement dans le processus de test. Il crée de vrais comptes Better Auth et utilise les cookies de session renvoyés par le serveur, sans identité simulée.

Dans l’environnement Sites géré, utiliser les commandes du plugin pour l’aperçu, la compilation et la publication. L’aperçu et la production ont des bases séparées. L’authentification simulée est désactivée dans tous les profils. Les en-têtes d’identité ChatGPT ne donnent aucun droit dans le jeu.

### Configuration des comptes

Copier `.env.example` vers `.dev.vars`, générer des secrets aléatoires et renseigner l’origine exacte de l’aperçu (`http://localhost:5173` avec `pnpm dev` dans une copie locale standard). Ces fichiers locaux ne sont jamais versionnés. Sur Sites, utiliser les variables de production protégées.

- `BETTER_AUTH_SECRET` : secret aléatoire de 32 octets au minimum.
- `CKK_APP_ORIGIN` : origine HTTPS exacte du jeu publié.
- `CKK_OWNER_EMAIL` : adresse réservée au propriétaire.
- `CKK_OWNER_SETUP_HASH` : SHA-256 du code privé d’activation, jamais le code lui-même.
- `CKK_OWNER_SETUP_EXPIRES` : expiration du code en millisecondes Unix.
- `CKK_OWNER_LEGACY_PROFILE_ID` : facultatif, profil historique à conserver lors de l’activation.

Le propriétaire ouvre `/admin/activate`, utilise son adresse réservée et le code privé remis séparément, puis choisit lui-même son mot de passe. Le premier inscrit ne devient jamais administrateur. L’activation n’est possible qu’une fois ; `/admin` exige ensuite sa session. Les comptes ordinaires se créent sur `/account`.

L’e-mail est déclaré mais non vérifié. Le service d’e-mail transactionnel n’est pas raccordé : la récupération se fait avec le code privé remis à l’inscription, affiché une seule fois. Ni mot de passe ni code de secours ne sont visibles dans l’administration.

### Base de données

Schéma dans `db/schema.ts`, migrations versionnées dans `drizzle/`. Après une modification : `pnpm db:generate`, examiner le SQL, puis appliquer la migration locale une seule fois. Après une compilation, pour une base locale neuve :

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_parched_talon.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_amusing_ser_duncan.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_hard_mindworm.sql
```

Sites fournit la liaison D1 `DB` et applique les migrations de production au déploiement. Aucun identifiant de base de production ni secret ne doit être ajouté au dépôt.

## Organisation du code

| Emplacement | Rôle |
| --- | --- |
| `components/game-app.tsx` | Accueil, navigation, création et invitation |
| `components/room-view.tsx` | Salle, classement, révélation, bilan et essai fictif |
| `components/profile-views.tsx` | Compte, statistiques, sets et règles |
| `components/auth-panel.tsx`, `lib/auth.ts`, `lib/auth-routes.ts` | Inscription, sessions et récupération |
| `components/admin-view.tsx`, `lib/admin-server.ts` | Gestion privée du propriétaire |
| `lib/server.ts` | Autorisations, API, cycle d’une partie et données privées |
| `lib/game-engine.ts` | Validation et calculs purs |
| `lib/game-data.ts` | Packs, questions et couleurs des rangs |
| `app/globals.css` | Direction artistique et responsive |
| `db/schema.ts`, `drizzle/` | Schéma et migrations |
| `tests/` | Calculs et intégration du Worker avec D1 |

Les détails et limites sont dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). La police Jost est distribuée avec sa licence dans `public/fonts/LICENSE.txt`.
