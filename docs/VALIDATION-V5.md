# Validation v5 — 26 septembre 2026

## Vérifications automatisées

- TypeScript : `pnpm typecheck`.
- Compilation Worker et navigateur : `pnpm build`.
- Moteur de classement : 7 tests.
- Worker réel et D1 jetable : 153 assertions, dont les 116 de la v4 et 37 concernant groupes/decks/droits fermés et administration. Authentification réelle du jeu, comptes et cookies isolés.
- Paiement : 40 assertions sur le Worker/D1 avec réponses HTTPS Stripe **simulées**. Aucun appel ni paiement Stripe réel.

Les tests de paiement vérifient notamment prix imposé côté serveur, origine, CGV, signature fausse/expirée, séparation test/live, retour impayé, accès d’un autre compte, réutilisation du checkout, concurrence, doublons, 24 h non renouvelées artificiellement, partage des droits avec les invités, expiration, rematch, pack séparé, remboursement, départ d’abonnement, échec/régularisation, litige, portail et suppression pendant un checkout terminé.

Les tests sociaux couvrent accès intercomptes, invitations hashées et révocables, decks privés, copie après suppression, accord unanime, retrait, départ/exclusion et retour, transmission de propriété, invités dans les parties associées et suppression d’un groupe sans perte des parties personnelles.

## Migrations

`0003_third_silver_centurion.sql` ajoute les tables sociales et commerciales et les colonnes des salles/membres. Sa clause d’ajout de `rooms.squad_id` inclut explicitement `ON DELETE SET NULL` : Drizzle n’a pas conservé cette action dans son ALTER généré, elle a été corrigée avant toute publication et validée par le test de suppression de groupe. `0004_empty_cardiac.sql` ajoute la preuve d’acceptation des conditions de vente à la commande. Les migrations 0000–0002 déjà publiées sont inchangées. Toutes les migrations sont appliquées dans les tests.

## Vérification navigateur

Aperçu interne : accueil et navigation, dialogue de création invité, restriction de l’espace Squad aux comptes, catalogue d’offres, indication explicite d’achats fermés et boutons désactivés. Direction artistique sombre/néon conservée. Capture de la page d’offres jointe à la livraison.

Les parcours de groupes authentifiés sont couverts par l’API isolée ; ils n’ont pas été parcourus intégralement dans le navigateur lors de cette livraison. La recette sur téléphones physiques et la recette marchande avec le vrai compte Stripe restent à faire.

## Limites de la validation

Pas d’audit indépendant, de certification, de test de charge représentatif, de test bancaire ou fiscal, ni de vérification d’un abonnement réel sur un cycle complet. Les statistiques sont bornées à 100 parties conservées, jusqu’à un an ; le jeu utilise un rafraîchissement périodique, pas des WebSockets. L’envoi d’e-mails de vérification n’est pas configuré ; récupération via code privé existante.

## Finalisation GitHub

L’ancien prototype est préservé dans une branche dédiée et la plateforme est importée sur main. Un workflow GitHub Actions à permissions de lecture, actions épinglées par commit et sans secrets de production vérifie la source, les types, le moteur, la compilation et les deux suites d’intégration. Les scripts de démarrage produisent des secrets de développement dans des chemins ignorés. Les droits exécutables des scripts shell sont conservés.

Une copie propre des sources a aussi été vérifiée : génération de la configuration locale, application des cinq migrations, seconde application sans migration restante, puis compilation réussie. Cette vérification réutilisait les dépendances déjà installées ; elle ne constitue pas une installation indépendante depuis le registre npm. GitHub Actions effectue l’installation à partir du lockfile dans son propre environnement.
