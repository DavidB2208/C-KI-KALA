# Validation v5 et correctif v5.1

## Correctif du 27 septembre 2026

- Types et compilation vérifiés après modification de l’authentification et de l’interface.
- Worker compilé/D1 isolée : **173 assertions**, désormais sous une origine HTTPS. Les 19 nouveaux contrôles partagent réellement le même ensemble de cookies entre trois clients et varient uniquement leur sélecteur d’onglet : identité, accès, votes distincts, reprise, création de compte avec conservation de l’historique, déconnexion et connexion indépendantes.
- Démarrage portable réel : **9 contrôles** dans une copie neuve, avec configuration et migrations automatiques. Inscription HTTP sur un port différent du port configuré, alias de boucle locale, trois joueurs et conservation des sessions.
- Paiements simulés : **40 assertions** ; moteur : **7 tests**. Le fournisseur Stripe reste simulé.
- Le test local réutilise les dépendances installées. GitHub Actions effectue séparément une installation à partir du lockfile et exécute aussi `pnpm test:local`.

L’inscription sur l’ancienne version a fonctionné à `localhost:5173` avec une configuration neuve. Le message ensuite précisé, « Cette adresse doit utiliser l’activation administrateur », correspond à l’adresse réservée au propriétaire avant sa première activation. Le serveur conserve cette protection et renvoie désormais un code d’erreur dédié ; le formulaire explique la situation et propose le lien vers `/admin/activate`. Le test d’intégration contrôle cette réponse. Les dépendances manuelles au démarrage, les origines locales figées et le partage involontaire du profil entre fenêtres ont été corrigés. Le détail d’utilisation est dans `TEST-LOCAL.md`.

Le premier passage CI v5.1 a révélé un défaut du test de démarrage : la recherche du texte `Local:` échouait lorsque Vite colorait sa sortie. La disponibilité est désormais vérifiée directement par une réponse HTTP de l’API, indépendamment des couleurs du terminal.

Le navigateur d’aperçu avait une base historique sans les migrations 0002–0004 : elle a été sauvegardée puis mise à jour sans suppression de données avant la recette. Cette opération locale n’a pas touché la base publiée.

Recette navigateur v5.1 : création d’une salle invitée, ouverture du deuxième puis du troisième onglet par le lien dédié, saisie de pseudos distincts et présence des trois joueurs dans la même salle. L’ouverture depuis un onglet déjà indépendant crée bien un nouvel invité.

## Livraison v5 du 26 septembre 2026

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
