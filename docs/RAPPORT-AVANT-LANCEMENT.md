# C KI KA LA — rapport de préparation au lancement

État vérifié le 27 septembre 2026. Ce rapport distingue l'application **déjà accessible publiquement** d'une ouverture commerciale à grande échelle. Le code et les tests ne prouvent ni la capacité en charge ni la conformité juridique d'une vente.

## Décision

**Jeu gratuit : prêt pour une bêta contrôlée avec de vrais joueurs. Vente : pas encore prête.** Les achats sont fermés dans la configuration publiée et aucune recette marchande réelle n'a été réalisée. Ne présenter ni les offres comme achetables ni le service comme audité ou sauvegardé tant que les vérifications ci-dessous ne sont pas terminées.

| Surface | État constaté | Preuve et limite |
| --- | --- | --- |
| Jeu, comptes et données | Code et tests d'intégration fonctionnels | 178 contrôles contre le Worker compilé et une D1 isolée ; pas une partie validée sur trois téléphones réels dans cette passe. |
| Plusieurs joueurs sur un ordinateur | Vérifié en local | 9 contrôles de démarrage, de sessions par onglet et de salle partagée. |
| Classement de soi, résultats et statistiques | Vérifiés dans les tests | Le jeu compte l'auto-classement ; le point d'intégration qui décrit les règles aux assistants a été corrigé pour l'indiquer. |
| Paiement | Implémenté, fermé en production | 40 contrôles avec réponses Stripe simulées ; aucune clé ou recette test/live d'un compte marchand n'a été validée ici. |
| Hébergement | Site de jeu déjà public | Le jeu est servi sur `https://c-ki-kala.davekawaii.chatgpt.site/`. GitHub Pages reste une page statique distincte sur `https://davidb2208.github.io/C-KI-KALA/` ; elle ne peut pas servir le Worker et D1. |
| Exploitation | Configuration de base présente | Les journaux d'erreur Worker récents consultés ne contenaient pas d'événement ; cela ne remplace pas la surveillance ni un test de restauration. |

Vérifications locales de cette passe : `pnpm check:source`, `pnpm typecheck`, `pnpm test` (8 tests), `pnpm build`, `pnpm test:integration` (178 contrôles), `pnpm test:billing` (40 contrôles) et `pnpm test:local` (9 contrôles) passent. Le lint global échoue encore : **110 erreurs et 34 avertissements sur 17 fichiers** avant le petit correctif de règles ; principalement typage `any`, règles React et navigation Next. Il n'est pas inclus dans le workflow CI. Les flux d'interface n'ont pas été validés dans un navigateur distant pendant cette passe ; les essais sur appareils restent nécessaires.

## Bloquants avant une ouverture commerciale

| Priorité | Responsable | Action et critère de fin |
| --- | --- | --- |
| P0 — vendeur et textes | Équipe + conseil compétent | Décider qui vend, établir les coordonnées réellement suivies, finaliser mentions de l'éditeur, conditions d'utilisation, confidentialité et CGV adaptées au public et aux pays visés. Les pages actuelles se déclarent encore « version de test ». |
| P0 — paiements | Responsable du compte marchand | Configurer Stripe en **test** sur un environnement et une base séparés ; vérifier checkout, webhook signé, portail, renouvellement, échec, remboursement et retrait des droits. Valider ensuite taxes, prix et support avant toute activation **live**. Voir `PAIEMENTS-V5.md`. |
| P0 — comptes | Équipe | Activer le compte propriétaire avec le code privé, vérifier l'accès admin et la récupération sur deux appareils. Choisir et tester un prestataire de vérification/récupération par e-mail ; actuellement l'adresse n'est pas vérifiée et la récupération dépend du code remis lors de l'inscription. |
| P0 — sauvegarde | Exploitation | Mettre en place une sauvegarde chiffrée de D1 et restaurer un échantillon dans une base distincte. Définir responsable, fréquence, surveillance et procédure de réponse aux demandes de suppression. Aucun essai de restauration de production n'a été fait ici. |
| P0 — recette réelle | David, Ariel et Isaac | Jouer une partie complète à trois sur téléphones et réseaux distincts : création, QR/code, auto-classement, expiration du vote, reconnexion, manche suivante, PNG, bilan, statistiques, revanche. Consigner et corriger chaque échec reproductible. |
| P0 — sécurité et capacité | Équipe + relecteur externe | Faire une revue indépendante de l'authentification, des droits, de la confidentialité et des dépendances, puis un essai de plusieurs salles simultanées avec budget/alertes D1. Les tests isolés et le contrôle limité des secrets ne valent pas audit de sécurité ou de charge. |

## Améliorations à programmer ensuite

1. **Qualité du code :** traiter les 110 erreurs et 34 avertissements ESLint, puis activer le lint dans la CI. Prioriser les dépendances de hooks et le typage des réponses API ; conserver les règles de sécurité, sans simplement désactiver ESLint.
2. **Exploitation des données :** remplacer la purge progressive au moment de la création d'une salle par une tâche planifiée si la suppression physique à l'échéance est une promesse contractuelle. Contrôler aussi le coût du polling toutes les 2,5 secondes lors de la montée en charge.
3. **Accessibilité :** vérifier clavier, lecteurs d'écran, couleurs et zoom à 200 % sur les écrans réels, en particulier le classement par tiers, les dialogues et les résultats.
4. **Confiance des joueurs :** valider les questions avec le public choisi, préciser le traitement des signalements et les règles de modération avant une audience large.
5. **Adresse et présentation :** choisir éventuellement un domaine propre au jeu. Tant que l'application dépend du Worker et de D1, GitHub Pages ne peut héberger que sa page de présentation ; ouvrir le jeu utilise l'origine du serveur.
6. **En-têtes et mises à jour :** la CSP utilise encore `unsafe-inline` pour le rendu du framework et le build signale l'ancienne convention `middleware`. Durcir ou migrer après validation de compatibilité, puis vérifier les avis de sécurité des dépendances au moment du lancement.

## Ordre conseillé

1. Ouvrir une **bêta gratuite limitée**, recueillir les retours des trois créateurs et corriger les incidents observés.
2. Préparer sauvegarde, support, identité de l'éditeur et audit indépendant ; valider charge et accessibilité.
3. Recetter les paiements de bout en bout en environnement Stripe test distinct, finaliser les textes, puis décider ensemble d'une date et d'un domaine pour l'ouverture commerciale.

Chaque livraison doit être vérifiée sur son propre commit GitHub et sur la version réellement déployée : un push sur `main` ne déploie pas automatiquement le Worker du jeu. Ne pas copier les secrets ou exports de base dans GitHub.

Repères officiels à consulter lors de la validation avec un conseil adapté aux pays visés : [information des personnes (CNIL)](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence), [règles du commerce en ligne (DGCCRF)](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/e-commerce-les-regles-entre-professionnels-et-consommateurs) et [nature statique de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
