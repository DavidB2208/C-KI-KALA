# C KI KA LA — état de finalisation

Mise à jour v5.4, 27 septembre 2026. Le [rapport avant lancement](RAPPORT-AVANT-LANCEMENT.md) donne l'état vérifié et les tâches restantes ; les documents v3 et v4 décrivent les anciennes livraisons. La matrice complète des 23 points du prompt est dans `ANALYSE-PROMPT-V5.md`.

Le correctif v5.1 prépare automatiquement la configuration et les migrations au démarrage local, accepte les changements de port sur la boucle locale et permet plusieurs joueurs indépendants dans un navigateur. Le guide pratique et les limites sont dans `TEST-LOCAL.md`. Les fenêtres classiques gardent leur session commune ; le bouton dédié crée un autre joueur sans remplacer le profil connecté.

Les parties affichent maintenant chaque joueur dans le vote, y compris soi-même. Les statistiques d’un compte viennent des parties terminées dans D1 ; le bouton **Actualiser mes stats** relit ces données, et les salles encore actives restent accessibles depuis la page. GitHub Pages conserve son adresse et affiche une page de présentation avec un lien explicite vers le jeu hébergé avec son API et sa base.

Au-dessus du résultat de chaque manche, les joueurs peuvent consulter les classements individuels et enregistrer la tier-list en PNG ; l'hôte avance depuis ce même endroit. Le bilan final donne accès aux votes des manches jouées et à la revanche. La description des règles pour les assistants indique désormais que chacun peut aussi se classer lui-même.

## Terminé dans le code

- Boucle complète de partie, codes/QR, invité sans compte, compte indépendant de ChatGPT, reprise et revanche commune.
- Base D1, règles de vote côté serveur, confidentialité pendant le vote, export/suppression et administration authentifiée.
- Squads privées, invitations expirantes/révocables, membres, transfert, exclusions et statistiques sous accord unanime retirable.
- Sets de noms, decks de questions privés et 7 packs : 60 questions gratuites + 80 Premium.
- Stats réelles, souvenirs, badges/XP de participation, partage d’images volontaire et avis sur les questions.
- Party Pass, Plus et packs séparés : checkout hébergé, contrôle des droits, webhooks signés/idempotents, portail client, résiliation, remboursement intégral/litiges, suppression de compte sans renouvellement laissé volontairement actif.
- Administration enrichie : comptes, parties, signalements, decks, appartenances aux Squads, commandes et états de paiement. Les accès détaillés sont journalisés ; jamais de mot de passe, carte ou clé Stripe affichés.
- Dépôt GitHub alimenté, ancien prototype conservé sur `archive/prototype-before-platform`, installation locale guidée, migration locale rejouable et workflow de vérification sans secret de production.

## Vérifications et preuves

Voir `VALIDATION-V5.md`. Le jeu et le paiement sont testés contre le Worker compilé avec D1 isolée. Pour Stripe, le fournisseur externe est simulé : aucun compte marchand ou encaissement réel n’est présenté comme validé. La CI exécute les mêmes vérifications à chaque push/PR ; consulter son résultat sur le commit concerné, pas seulement la présence du fichier de workflow.

`pnpm check:source` repère les fichiers privés et quelques formats de secrets connus. Ce contrôle limité n’est ni une analyse exhaustive des secrets ni un audit de sécurité indépendant. Les deux chaînes de paiement présentes dans les tests sont des valeurs factices explicites.

## Étapes qui nécessitent encore l’équipe

| Étape | Pourquoi elle ne peut pas être inventée | Guide |
| --- | --- | --- |
| Stripe test puis live, webhook, portail, support | Nécessite votre compte marchand, vos clés et l’acceptation des conditions du prestataire. Aucune vente activée par défaut. | `PAIEMENTS-V5.md` |
| Identité éditeur, CGV, taxes, données et rétractation | Dépend de votre structure, pays, public et politique commerciale ; aucun texte fictif n’est présenté comme une validation juridique. | `LANCEMENT.md` |
| Recette sur appareils réels, charge et budget | Les tests isolés ne prouvent pas le réseau mobile, la capacité ou le coût d’une fréquentation réelle. | `LANCEMENT.md` |
| Sauvegarde/restauration et surveillance des paiements | Nécessite l’accès à l’exploitation de la base et au compte marchand. | `EXPLOITATION.md` |
| Vérification/récupération par e-mail | Aucun prestataire d’e-mail n’est configuré. Le code de récupération privé fonctionne déjà ; ne pas annoncer d’e-mail vérifié. | `README.md` |

Les achats restent fermés tant que les informations marchand et les clés ne sont pas configurées. Les groupes, decks et parties gratuits restent disponibles. Une pause ultérieure des nouvelles ventes doit utiliser uniquement `CKK_CHECKOUT_OPEN=0` pour conserver les droits payés et le traitement des événements.

## Choix reportés volontairement

Publicités, parrainage récompensé, marketplace, sponsors, chat public, classement global et diagnostics de personnalité : coût, modération, fraude ou mauvaise adéquation avec une première soirée fluide. Ce sont des exclusions explicites de périmètre, pas des boutons simulant une fonction absente.

## Dépôt et déploiement

Le dépôt GitHub est le point de collaboration de l’équipe. Sites garde son dépôt technique de publication ; les deux instantanés de source sont synchronisés pendant cette livraison. **Un push GitHub ne met pas automatiquement le site en ligne.** Ne pas ajouter de clé de déploiement ni de jeton Sites au dépôt. Le workflow CI se limite aux vérifications.

L’ancien prototype reste consultable dans sa branche d’archive. Ses instructions PeerJS/Supabase ne s’appliquent pas à la plateforme D1 et ne doivent pas être exécutées sur sa base. La note historique demandant de modifier une tier-list est couverte pendant la préparation du vote ; une fois validé, le bulletin est scellé pour préserver l’équité.

Adresse du jeu : https://c-ki-kala.davekawaii.chatgpt.site. GitHub Pages, encore actif pour le dépôt historique, ne peut servir qu’une page statique et n’héberge pas cette application avec comptes et D1.

Preuve de CI : le commit `46b8c1197d9bafc3863c027c812f178ef5f109ed` a réussi le workflow « Verify C KI KA LA » (installation indépendante, types, compilation, 7 tests moteur, 153 assertions jeu/social et 40 assertions Stripe simulées) : https://github.com/DavidB2208/C-KI-KALA/actions/runs/36245860268. Les ajouts suivants à ce document précisent uniquement la livraison et ne remplacent pas le statut de leur propre commit.
