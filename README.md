[Page C KI KA LA sur GitHub Pages](https://davidb2208.github.io/C-KI-KALA/) · [Ouvrir le jeu](https://c-ki-kala.davekawaii.chatgpt.site/)

# C KI KA LA — Hallila Games

Party-game web de classement entre amis, créé avec David, Ariel (Taunille Starque) et Isaac (Craftmine). Cette version reprend la direction artistique du prototype : Jost, logo centré, violet/bleu nuit et rangs S–E colorés.

## Version livrée — v5.4

Correctif du 27 septembre : démarrage local automatique et joueurs indépendants dans plusieurs onglets. Guide de test : [docs/TEST-LOCAL.md](docs/TEST-LOCAL.md).

Le détail des décisions sur les 23 points du prompt commercial est dans [docs/ANALYSE-PROMPT-V5.md](docs/ANALYSE-PROMPT-V5.md).

Pour l'état de préparation au lancement et les actions qui restent à faire, voir le [rapport avant lancement](docs/RAPPORT-AVANT-LANCEMENT.md).

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

L’hôte choisit le pack, 1/3/5/10/15 manches et 45/60/90/120 secondes. Les entrées sont fermées au début ; les participants inscrits peuvent revenir. Chacun classe les joueurs, y compris soi-même, ou les éléments du set ; il peut explicitement placer un nom dans « Non classé ». Plusieurs noms peuvent partager un rang.

S vaut 5, A 4, B 3, C 2, D 1, E 0. Le rang mesure combien la question correspond à la personne, pas sa valeur. Le résultat est la moyenne des votes valides reçus, arrondie pour déterminer le rang ; les égalités restent des égalités. Une abstention, un nom non classé ou une absence de vote n’est pas un E. Une question passée par l’hôte ne compte pas dans les moyennes ni dans les votes statistiques. Une partie apparaît dans l’historique quand l’hôte termine son bilan.

## Développement

Node ≥22.13 et pnpm, avec les versions verrouillées dans `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir **http://localhost:5173**. Dans une copie standard, `pnpm dev` crée la configuration de développement si elle manque puis applique les migrations locales restantes, sans remplacer les secrets ni vider la base. Le serveur reste actif dans ce terminal ; arrêter avec Ctrl+C. Si le port est occupé, le démarrage échoue explicitement : arrêter l’autre serveur ou utiliser `pnpm dev --port 5174`. Les adresses et ports de boucle locale sont acceptés uniquement avec une configuration locale.

Pour les vérifications, dans un autre terminal :

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
pnpm test:billing
pnpm test:local
```

Le test d’intégration charge le Worker compilé et une base D1 jetable dans Miniflare. Il n’accède jamais à la production. Son contrôleur de fixtures existe uniquement dans le processus de test. Il crée de vrais comptes Better Auth et utilise les cookies de session renvoyés par le serveur, sans identité simulée.

Dans l’environnement Sites géré, utiliser les commandes du plugin pour l’aperçu, la compilation et la publication. L’aperçu et la production ont des bases séparées. L’authentification simulée est désactivée dans tous les profils. Les en-têtes d’identité ChatGPT ne donnent aucun droit dans le jeu.

### Configuration des comptes

Pour une installation standard, laisser `pnpm dev` générer `.dev.vars`, ou exécuter explicitement `pnpm setup:local` puis `pnpm db:migrate:local`. Ne pas remplacer ce fichier généré par `.env.example`. Une configuration déjà présente est conservée : vérifier son secret et son origine en cas d’erreur. Les fichiers locaux ne sont jamais versionnés. Sur Sites, utiliser les variables de production protégées.

- `BETTER_AUTH_SECRET` : secret aléatoire de 32 octets au minimum.
- `CKK_APP_ORIGIN` : origine HTTPS exacte du jeu publié.
- `CKK_OWNER_EMAIL` : adresse réservée au propriétaire.
- `CKK_OWNER_SETUP_HASH` : SHA-256 du code privé d’activation, jamais le code lui-même.
- `CKK_OWNER_SETUP_EXPIRES` : expiration du code en millisecondes Unix.
- `CKK_OWNER_LEGACY_PROFILE_ID` : facultatif, profil historique à conserver lors de l’activation.

Le propriétaire ouvre `/admin/activate`, utilise son adresse réservée et le code privé remis séparément, puis choisit lui-même son mot de passe. Le premier inscrit ne devient jamais administrateur. L’activation n’est possible qu’une fois ; `/admin` exige ensuite sa session. Les comptes ordinaires se créent sur `/account`.

L’e-mail est déclaré mais non vérifié. Le service d’e-mail transactionnel n’est pas raccordé : la récupération se fait avec le code privé remis à l’inscription, affiché une seule fois. Ni mot de passe ni code de secours ne sont visibles dans l’administration.

### Base de données

Schéma dans `db/schema.ts`, migrations versionnées dans `drizzle/`. Après une modification : `pnpm db:generate`, examiner le SQL, puis appliquer la migration locale une seule fois. Pour une base locale neuve, `pnpm db:migrate:local` applique toutes les migrations 0000 à 0004 et mémorise celles déjà appliquées. La commande force `--local` et n’accepte aucun argument pour atteindre une base distante. Si une ancienne base de développement a été créée avec les commandes SQL manuelles de la v4 sans registre de migrations, conserver une sauvegarde et utiliser une base locale neuve ; ne pas rejouer les créations de tables sur cette ancienne base.

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

## GitHub et finalisation

Dépôt : https://github.com/DavidB2208/C-KI-KALA ; l’ancien prototype PeerJS/Supabase est conservé sur `archive/prototype-before-platform`. `main` contient la plateforme D1. Le workflow GitHub Actions compile et teste le jeu sans secret de production ni transaction Stripe réelle ; il ne déploie pas automatiquement.

Jeu en ligne : https://c-ki-kala.davekawaii.chatgpt.site

GitHub Pages affiche une page de présentation à l’adresse `https://davidb2208.github.io/C-KI-KALA/` et ne redirige plus automatiquement. Le bouton « Ouvrir le jeu » ouvre l’application sur son hébergement actuel dans un autre onglet : GitHub Pages ne peut pas exécuter le Worker ni héberger la base D1 nécessaires aux salles, aux comptes et aux statistiques. La CI « Verify C KI KA LA » vérifie le code sur GitHub ; son résultat et le workflow Pages ne publient pas automatiquement le serveur du jeu.

Voir [docs/FINALISATION.md](docs/FINALISATION.md) pour les éléments achevés, les décisions écartées et les seules étapes qui nécessitent encore l’équipe ou un compte prestataire. Les guides v3/v4 sont historiques.
