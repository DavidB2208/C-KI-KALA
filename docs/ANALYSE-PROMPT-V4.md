# C KI KA LA — Analyse critique du prompt et décisions v4

25 septembre 2026. Source : prompt fourni dans « Texte collé(2).txt ».
Cette version applique les améliorations utiles immédiatement ; elle ne prétend pas livrer d’un coup les cinq phases du prompt. Les arbitrages ci-dessous restent révisables par David, Ariel et Isaac.

## Ce qui a été codé

- **Revanche réelle** : une nouvelle salle reprend les réglages, le pack et les éléments du set. Les questions du pack sont retirées au hasard ; une question libre reste identique et les propositions de la boîte à thèmes repartent de zéro. La première personne qui clique devient l’hôte. Chaque participant rejoint volontairement. Les clics concurrents convergent vers une seule salle, sans dupliquer les votes ou effacer l’historique. Si cette revanche est déjà lancée, les règles habituelles de reconnexion s’appliquent ; pour une nouvelle soirée depuis une ancienne partie, utiliser « Créer une autre partie ».
- **Partage maîtrisé** : aperçu, image Story 1080 × 1920 ou tier-list complète, noms masqués par défaut, téléchargement PNG et partage natif de fichier lorsqu’il est pris en charge. Le lien copié renvoie à l’accueil, jamais aux résultats privés. Aucune publication sur Instagram ou WhatsApp n’est effectuée automatiquement.
- **Souvenirs chiffrés** : jusqu’à 12 questions réellement jouées avec moyenne sur 5, nombre de votes, rangs S et manches concernées. Les sets d’éléments, manches passées, abstentions et noms non classés n’ajoutent pas de rang reçu au joueur.
- **Badges sobres** : première soirée, 5 parties terminées, 50 classements envoyés. Calculés sur les mêmes données conservées que les statistiques, sans XP artificielle ni jugement de personnalité.
- **Avis sur les questions** : « À garder / À revoir », modifiable et retirable, un avis par participant et par manche révélée. L’administration dispose des totaux du catalogue et du nombre de salles ; aucun retrait automatique des questions.
- **Mesure des revanches** : administration avec parties terminées depuis 30 jours, revanches créées et revanches effectivement lancées. Ce sont trois nombres distincts, pas une promesse de product-market fit.
- **Positionnement plus juste** : « Le jeu pour découvrir comment tes potes te voient ». L’accueil garde la création et la jonction immédiatement accessibles.

## Analyse de chacun des 23 points

| N° | Proposition | Décision et critique | État dans cette version |
| --- | --- | --- | --- |
| 1 | Party-game + réseau social privé + contenu | Garder l’ambition comme direction, pas comme périmètre immédiat. Un réseau social nécessite des droits de groupe, sorties, modération et contrôles de visibilité. « Connaît vraiment » suggère une vérité que des votes de soirée ne démontrent pas. | Promesse reformulée, souvenirs renforcés ; réseau social différé. |
| 2 | Jouer → inviter → rire → sauvegarder → partager → revenir → payer | Une personne peut revenir sans partager ni payer. La boucle utile est jouer → débattre → rejouer ; le partage et l’achat restent des branches volontaires. | Revanche et partage ajoutés ; aucun tunnel obligatoire. |
| 3 | Gameplay prioritaire et QR → pseudo → partie | À conserver. Une inscription imposée à l’hôte casserait également une soirée improvisée. | Hôte et invités jouent sans compte ; contrôles serveur conservés. |
| 4 | Faire des sets le cœur de tout le contenu | Un set actuel contient les éléments classés, un pack contient les questions : ce ne sont pas des objets interchangeables. Fusionner les deux ferait perdre une règle essentielle. Les futures questions personnalisées devront former un objet « deck » distinct. | Distinction explicitée dans le catalogue. Aucun faux pack de 150 questions ni catalogue vide. |
| 5 | Gratuit réellement bon | Oui : ne pas retirer des fonctions existantes pour fabriquer une contrainte d’achat. « Certaines parties sauvegardées » doit devenir une limite claire si elle existe un jour. | Packs, jeu, statistiques et sauvegarde existants restent accessibles ; aucune Squad fictive. |
| 6 | Party Pass 2,99 € / 24 h | Bon candidat à tester pour un usage occasionnel, mais le prix n’est pas validé. « Toute la room pendant 24 h » est ambigu lorsque l’hôte change ou relance. Il faut définir activation, expiration et droits pendant une manche avant de vendre. | Différé ; prix conservé comme hypothèse de test, aucun bouton d’achat inactif. |
| 7 | C KI KA LA+ 4,99 €/mois ou 34,99 €/an | Un abonnement doit correspondre à une fréquence de retour observée. La longue liste d’avantages mélange droits de la salle et données privées du compte. « Historique complet » contredit actuellement la conservation d’un an et le calcul borné à 100 parties. | Différé ; aucune limite gratuite supprimée, aucun historique illimité promis. |
| 8 | Packs à 1,99–3,99 € | Les achats permanents peuvent concurrencer l’abonnement et multiplier les offres à comprendre. Tester un seul produit d’abord. Prix, contenu réel et modalités d’accès doivent être cohérents. | Catalogue gratuit existant préservé avec vrais nombres de questions. Vente différée. |
| 9 | Squads permanentes | Idée intéressante pour la mémoire du groupe, mais la plus structurante : identité du groupe, invitations révocables, départ/exclusion, consentement à rattacher une partie, changement de propriétaire et suppression. Additionner les pseudos ne suffit pas à identifier un groupe. | Différé en chantier dédié. Aucun regroupement automatique des joueurs. |
| 10 | Profils, XP, niveaux, badges et trophées | Les seuils de participation sont explicables. « Clown », « mytho » ou « premier à mourir » ne doivent pas devenir des étiquettes automatiques et persistantes. Le tier moyen reste un score de questions, pas une qualité humaine. | Badges de participation et souvenirs privés ; pas de classement public ni XP. |
| 11 | Résultats Story, WhatsApp, lien public | 72 % / 19 % / 9 % ne se déduisent pas de moyennes de tier-list sans changer de métrique. Un résultat public peut exposer des noms et questions personnels. Le partage doit partir d’un aperçu et d’une action explicite. | PNG vertical et complet, moyennes exactes, pseudos masqués par défaut, partage natif avec repli téléchargement. URL publique de résultat différée. |
| 12 | Conversion invité → compte après la partie | À conserver sans fenêtre bloquante. Dire précisément ce qui est conservé évite les pertes attendues après changement de navigateur. | Création du premier compte sur le même navigateur conserve les participations invitées. La connexion à un compte déjà existant ne fusionne pas cet historique. |
| 13 | Insights, rival principal, meilleur ami statistique | Les rangs S sont des votes, pas des victoires : plusieurs personnes peuvent recevoir S. Une question négative inverse l’interprétation. « Meilleur ami » et « rival » infèrent une relation sans base fiable. | Texte exact de la question, moyenne, rangs S, votes et manches. Inférences relationnelles écartées. Évolution temporelle différée. |
| 14 | Like / Dislike sur les questions | Utile, à condition de distinguer goût et signalement. Un faible nombre d’avis ou les mêmes amis répétant une question ne représentent pas tout le public. Une question difficile peut être appréciée sans être « positive ». | Avis persistants après révélation, modification/retrait, contrôle de participation ; synthèse catalogue réservée au propriétaire. Pas de suppression automatique. |
| 15 | Publicité secondaire, interstitiels et rewarded ads | Une publicité entre le résultat et la revanche concurrence directement la priorité annoncée. « Zéro pub » n’est pas un bénéfice différenciant tant que tout le jeu est sans publicité. L’intégration réclame un fournisseur, des choix de suivi et des tests de fluidité. | Aucun SDK ni écran publicitaire. À tester plus tard, avec accès gratuit toujours utilisable sans récompense publicitaire. |
| 16 | Parrainage : 3 comptes → 24 h | Récompenser une simple inscription encourage les comptes multiples et ne prouve pas une nouvelle partie. Avant de le coder, définir activation réelle, plafonds, attribution et prévention des abus. | Différé explicitement. Aucune collecte de contacts. |
| 17 | Marketplace créateurs | La commission seule ne décrit pas le produit : qualité, propriété du contenu, remboursements, partage des revenus et traitement des abus restent à résoudre. | Différé comme le prompt le demande. |
| 18 | Sponsors et marques | Une source envisageable après preuve d’audience, sans transformer les statistiques de groupe en données de ciblage. Les résultats de campagne doivent rester distincts des profils privés. | Différé ; aucune donnée envoyée à des marques. |
| 19 | Phases 0 à 5 | L’ordre est pertinent mais la v3 avait déjà livré plusieurs fonctions des phases 1 et 2. Éviter de les reconstruire. Les étapes ne sont pas automatiquement franchies parce que les pages existent. | Stabilisation conservée ; amélioration ciblée de revanche, souvenir et partage. |
| 20 | Fun avant viralité, rétention, monétisation | Le principe protège la fluidité. En cas de conflit, ne pas placer la viralité devant la confidentialité ou le confort du groupe. Un partage facultatif vaut mieux qu’une condition pour rejouer. | Aucune action commerciale imposée ; partage et inscription restent secondaires. |
| 21 | La mémoire comme promesse finale | Oui, si cette mémoire est choisie et explicable. « Après plusieurs mois tout est conservé » doit respecter la durée annoncée et la possibilité de partir/supprimer. Les private jokes ne sont pas déduites automatiquement. | Souvenirs privés issus des votes conservés ; périmètre 100 parties / un an visible. |
| 22 | Ordre des revenus : Pass, abonnement, packs… | À traiter comme une succession d’expériences, pas sept offres à lancer ensemble. Commencer par démontrer l’envie de rejouer ; tester le Pass ensuite ; n’ajouter l’abonnement qu’avec usage récurrent constaté. | Ordre documenté, aucune facturation ni droit premium accordé par le navigateur. |
| 23 | Évaluer chaque fonction par fun/acquisition/rétention/revenu | Ajouter le coût de maintenance, la compréhension des règles et les effets sur la vie privée. Un compteur de clics de partage ne mesure pas des amis acquis ; un lobby de revanche n’est pas une partie jouée. | Compteurs serveur séparés pour créations et lancements de revanche ; pas de faux indicateurs d’acquisition. |

## Conditions avant une première offre payante

Les prix du prompt sont des hypothèses fournies par l’équipe, pas une étude de disposition à payer ni une validation de rentabilité. Tester l’offre avec de vrais groupes ; confronter recettes nettes, frais, coûts d’usage, retours et remboursements avant de retenir un prix. Le ZIP ne contient aucun service de paiement activé.

Pour une première expérimentation, définir une seule offre : durée exacte à partir de l’achat/activation, contenu inclus, bénéfice de l’hôte et portée dans ses salles. Les invités gardent l’accès sans compte. Le changement d’hôte, l’expiration pendant une partie et la reconnexion doivent avoir un comportement écrit et testé.

Un déploiement commercial devra prévoir côté serveur : droits d’accès et dates d’expiration, confirmation de paiement signée, traitement idempotent des événements, révocations/remboursements, environnement de test et rapprochement. Un retour de page « paiement réussi » ne doit jamais débloquer une fonction à lui seul. Il faut aussi les informations légales de l’éditeur et les e-mails transactionnels ; ces éléments ne peuvent pas être inventés dans le code.

## Base, confidentialité et limites

- Migration additive `drizzle/0002_hard_mindworm.sql` : tables `rematches` et `question_feedback`, clés étrangères et unicité. Les migrations déjà publiées sont inchangées.
- Une transaction regroupe création de salle, hôte, manches et lien de revanche. Une collision sur le lien annule toute la création perdante puis rejoint la salle gagnante.
- Les avis nécessitent une session et une participation au roster. Ils restent privés côté joueur ; la synthèse propriétaire ne montre que des totaux du catalogue. Avis libres conservés pour export/suppression, sans les publier dans le catalogue.
- L’export personnel inclut les avis ; la suppression du compte les efface. La suppression des salles expirées efface aussi les liens et avis associés.
- Les souvenirs et badges sont calculés à partir des 100 dernières parties terminées éligibles, conservées au maximum un an. Les badges peuvent donc évoluer lorsque le périmètre change ; ce ne sont pas des trophées permanents.
- La synthèse de questions agrège les textes identiques et peut mélanger plusieurs groupes ; elle ne prétend pas mesurer une personnalité ou la réputation publique.
- Les fichiers partagés sont générés sur l’appareil. Ils peuvent ensuite être diffusés par le joueur ; le jeu ne peut pas révoquer une image déjà téléchargée. L’anonymisation des noms ne rend pas automatiquement anonyme le texte d’une question personnelle.
- L’inscription facultative, les contrôles d’hôte, les votes secrets avant révélation, les limites de requêtes et le cloisonnement des comptes restent en place.

## Vérification

- Compilation Worker : réussie.
- TypeScript : réussi.
- Tests du moteur : 7 réussis.
- Tests d’intégration Worker + D1 jetable : 116 contrôles réussis, dont concurrence des revanches, absence de salle orpheline, copie des réglages, confidentialité des avis, modification/retrait des avis, suppression avec le compte, souvenirs chiffrés et badges.
- Les tests isolés n’accèdent pas à la base de production.
- Contrôle navigateur du partage : résultat détaillé dans `docs/VALIDATION-V4.md`.

Les paiements, les vraies Squads, la charge simultanée à grande échelle, la restauration de production et le partage natif sur chaque modèle de téléphone n’ont pas été validés par ces tests. La version reste une bêta fonctionnelle.
