# Passer de la bêta au lancement commercial

## Ce qui est jouable maintenant

Le parcours complet fonctionne : créer, rejoindre, attendre, voter, révéler et terminer. Les profils, parties, votes et sets sont persistants. Les statistiques proviennent des votes enregistrés, pas de valeurs fictives. Seule la page « Essayer une manche » emploie des joueurs et votes simulés, explicitement indiqués.

Les joueurs disposent de comptes C KI KA LA indépendants. Le site doit être en accès public pour que le lien soit utilisable sans connexion ChatGPT ; les profils privés et l’administration restent protégés par les comptes du jeu. Le propriétaire active lui-même son compte avec le code remis séparément.

## Priorités avant une vente

| Priorité | Travail concret | Critère de fin |
| --- | --- | --- |
| P0 — expérience | Jouer à trois sur de vrais téléphones avec David, Ariel et Isaac ; tester interruption réseau et reconnexion | Une partie entière sans accompagnement, avec retours consignés |
| P0 — identité | Activer le propriétaire, essayer deux appareils ; raccorder un prestataire pour vérification et récupération par e-mail | Codes de secours conservés ; envoi et validation des e-mails testés avant de les annoncer |
| P0 — exploitation | Mesurer plusieurs salles simultanées, coûts, limites et latence ; définir un budget et des alertes | Objectif de fréquentation chiffré et test réussi |
| P0 — données | Organiser sauvegarde, restauration, purge et traitement des demandes de suppression | Restauration testée et responsable désigné |
| P0 — sécurité | Relecture indépendante de l’API et des dépendances ; vérifier la frontière d’authentification | Anomalies bloquantes corrigées, rapport conservé |
| P0 — éditeur | Finaliser identité de l’éditeur, contact, conditions et information sur les données ; faire valider les textes selon le public/pays visé | Pages de test remplacées par les informations définitives |
| P0 — modèle économique | Relire les offres et prix implémentés, fixer taxes, CGV, règles de remboursement/support | Offre validée par les trois créateurs |
| P0 — paiement | Configurer le compte Stripe, le webhook et le portail, puis exécuter la recette marchande de PAIEMENTS-V5.md | Achat réel en environnement test, renouvellement, remboursement et retrait des droits validés |
| P1 — contenu | Relire les 140 questions, préciser le public visé et organiser les signalements | Catalogue approuvé et procédure de traitement prête |
| P1 — accès | Configurer domaine et audience du site | Lien et QR essayés hors des appareils des créateurs |

Le code de vente est présent en v5 ; aucun compte marchand ni encaissement réel n’a été créé. Les achats restent fermés par défaut. Les comptes, Squads et decks gratuits peuvent fonctionner sans Stripe. La configuration et la politique de remboursement sont décrites dans [PAIEMENTS-V5.md](PAIEMENTS-V5.md).

## Protocole de test entre vous

1. Chacun ouvre le site sur son appareil et choisit son pseudo.
2. L’un crée une partie de trois manches, les deux autres utilisent le code et le QR.
3. Chaque joueur se classe aussi lui-même ; vérifier que personne ne voit les votes avant le verdict.
4. Pendant une manche, fermer puis rouvrir un onglet. Tester aussi une abstention et une question passée.
5. Terminer la partie et vérifier l’historique des comptes.
6. Refaire une partie avec un set personnalisé et la boîte à thèmes.
7. Noter ce qui fait rire, ce qui ralentit le jeu et les questions à réécrire. Décider les changements ensemble.

Tester aussi une Squad avec retrait de consentement, un deck et la recette des offres. Garder classement public, chat, publicités, parrainage récompensé et marketplace hors de cette première ouverture : les choix détaillés figurent dans ANALYSE-PROMPT-V5.md.
