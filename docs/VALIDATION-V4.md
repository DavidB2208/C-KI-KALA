# Validation v4 — 25 septembre 2026

## Contrôles automatiques

- Compilation du Worker compatible avec l’hébergement actuel : réussie.
- `pnpm typecheck` : réussi.
- `pnpm test` : 7 tests du moteur réussis.
- `pnpm test:integration` : 116 assertions réussies sur le Worker compilé et une base D1 jetable.
- Migration 0002 générée par Drizzle et examinée : création additive de deux tables et de leurs index, aucune modification des migrations publiées. Application réussie dans la base isolée des tests.

Les nouveaux contrôles portent notamment sur l’autorisation des participants, les avis interdits avant révélation, la validation des valeurs, le changement et le retrait d’un avis, sa confidentialité, son export et son effacement lors de la suppression du compte. Ils vérifient aussi une revanche concurrente unique sans salle orpheline, la copie des réglages et des sets, l’absence de duplication des votes, la préservation de l’ancienne partie et la distinction entre revanche créée et effectivement lancée.

Les contrôles précédents restent couverts : sessions, contrôle d’origine, rôles, données privées, passage invité → compte, votes secrets, abstentions, « Non classé », calculs, cycle de la partie et douze invités sur une même connexion.

## Contrôle navigateur sur aperçu local

Parcours `/demo` : Ariel classé S, Isaac et Liam laissés non classés. Le résultat intègre les deux bulletins simulés documentés par la démonstration : Ariel 4,67 / 5 avec 3 votes ; Isaac 4 / 5 avec 2 votes ; Liam 3 / 5 avec 2 votes.

- Ouverture de l’aperçu de partage et format Story sélectionné par défaut.
- Option d’inclusion des noms décochée à l’ouverture ; retour au masquage après fermeture et réouverture.
- Inclusion volontaire des noms et changement vers le format tier-list complète.
- Génération réelle du PNG Story 1080 × 1920, fichier téléchargé et inspecté visuellement : noms, moyennes, nombres de votes et mention « Démonstration · votes simulés » cohérents. Le mécanisme d’attente d’événement du navigateur de test a expiré, mais le fichier a bien été créé sur disque.
- Copie du lien : dans cet aperçu HTTP, l’API presse-papiers n’a pas fonctionné. Le repli prévu affiche correctement un champ sélectionnable contenant uniquement l’accueil du jeu, sans code de salle.
- La boîte de dialogue utilise les primitives accessibles déjà installées ; les boutons de téléchargement restent désactivés pendant la génération.

Aucun partage vers un compte Instagram, WhatsApp ou autre tiers n’a été envoyé. Le partage natif de fichier dépend du navigateur et reste à tester sur de vrais téléphones. Les tests automatiques couvrent le serveur des souvenirs, des avis et des revanches ; ce contrôle visuel ne constitue pas une partie multi-appareils réelle ni un audit d’accessibilité exhaustif.

## Limites avant commercialisation

Activation du propriétaire, e-mails transactionnels, informations légales, exercice de restauration, alertes opérationnelles et tests de charge restent à terminer. Les moyens de paiement et offres commerciales ne sont pas activés. Les dépendances sont celles de la v3 : cette modification ne constitue pas un nouvel audit indépendant de sécurité.
