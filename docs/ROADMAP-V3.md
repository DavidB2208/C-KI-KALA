# C KI KA LA — livraison v3, 24 septembre 2026

Source consultée : [Roadmap du dossier Hallila C KI KA LA](https://docs.google.com/spreadsheets/d/1MBgKS7jcMrk-dSbDkuTobMlPefQ7PVggOrleKbM5Rqc/edit?usp=drivesdk). Dernière modification indiquée par Drive : 27 mai 2026. Le document partagé a été lu, sans modifier les statuts décidés par l'équipe.

## Parcours invité

Rejoindre par code ou QR demande uniquement un pseudo. Les routes du jeu acceptaient déjà les sessions invitées ; l'interface rend maintenant ce choix explicite, avec « Rejoindre sans compte ». L'hôte peut aussi créer une salle sans compte. L'e-mail et le mot de passe ne sont demandés que si la personne choisit de créer un compte.

À la fin, « On en refait une ? » reste disponible. La proposition de compte est facultative. La première inscription sur le navigateur porteur du cookie invité conserve l'identité du profil et ses participations ; l'ancien cookie invité est révoqué. Une connexion à un compte déjà existant retrouve l'historique de ce compte et ne fusionne pas automatiquement les identités.

## Correspondance avec la roadmap

Les numéros ci-dessous sont ceux de la première colonne, commençant à zéro.

| Ligne | Sujet | Traitement dans cette version |
| --- | --- | --- |
| 2 — P1 | Possibilité de ne pas classer | Ajout d'une zone « Non classé », choix individuel ou pour les noms restants. Le serveur exige un choix explicite pour chaque cible ; `null` n'est jamais assimilé à E. L'abstention complète reste disponible pendant les parties. |
| 3 — P1 | Calcul et affichage des tiers | Moyenne calculée uniquement sur les votes reçus ; omissions, abstentions et manches passées exclues. Score exact conservé, rang arrondi. |
| 4, 6 — P1 | Sets et tier list | Fonctions existantes conservées ; validation des nouveaux votes partiels et protection des sets privées vérifiées. |
| 5 — P1 | Boutons sur téléphone | Sélection d'un nom puis d'un rang, indication du nom sélectionné, commandes adaptées au pointeur tactile et retour possible à « à choisir ». |
| 7 — P2 | QR code | Fonction existante conservée ; destination avec pseudo seul explicitée. |
| 8 — P2 | Sélection sur ordinateur | Pas de panneau supplémentaire de sélection ; glisser-déposer conservé, rangs cliquables maintenus pour le clavier et l'accessibilité. |
| 9 — P2 | Recherche dans l'historique | Recherche par question, pack, nom de set, code ou date ; filtre joueurs/sets, sans modifier les totaux. |
| 10 — P2 | Parcourir les tier lists individuelles | Navigation précédent/suivant après révélation de la manche. Aucun bulletin d'un autre joueur n'est transmis avant révélation. Manches passées masquées. |
| 12 — P2 | Télécharger la tier list | Export PNG local du résultat collectif, sans service externe et sans inscription. Disponible aussi en démonstration, signalée comme fictive. |
| 13 — P2 | Historique sans titre/visuel | Question représentative et vignette de pack ajoutées ; pas de capture d'image enregistrée par partie. |
| 15 — P2 | Dépôt entre deux rangs | Seules les zones de rang acceptent le dépôt ; fin de glissement nettoie la sélection et le survol. |
| 21 — P4 | Garder le set d'une partie | Bouton facultatif « Garder ce set » dans le bilan pour les participants avec compte. La limite et les droits des sets restent appliqués côté serveur. |

Les sets d'images téléversées, les couleurs exclusives, une nouvelle musique, les personnages et le logo restent à décider/implémenter avec Ariel et Isaac. Aucune ressource externe ou dépense n'a été engagée pour ces sujets. La banque de questions et la boîte à thèmes existantes sont conservées.

## Corrections liées à l'audit

- Le plafond d'inscription passe à 30 créations par heure et par IP ; le plafond court d'authentification à 60 requêtes par minute et par IP. Douze nouveaux comptes sur un réseau partagé sont testés.
- Les compteurs par couple IP/adresse et par opération sont conservés. Les échecs depuis d'autres réseaux ne verrouillent plus globalement la connexion d'une adresse. Inscription et récupération ont leurs propres compteurs. Cette mesure n'est pas une protection exhaustive contre les attaques distribuées : challenge adaptatif et surveillance restent des étapes d'exploitation.
- Les statistiques joueur et propriétaire partagent une requête agrégée sur les mêmes 100 dernières parties terminées, avec les mêmes exclusions. Suppression des requêtes D1 successives par partie.
- Les salons arrêtent leur rafraîchissement après fin/fermeture ; les onglets masqués suspendent les requêtes et reprennent au retour. Les erreurs réseau entraînent une temporisation progressive jusqu'à 30 secondes.
- Les corps JSON `null`, tableaux ou scalaires sont refusés avec 400 au lieu de provoquer un 503.
- En-tête HSTS sur les réponses HTTPS, sans extension aux sous-domaines ni demande de préchargement.
- Mise à jour de Next et eslint-config-next de 16.2.6 à 16.3.3 ; correctifs compatibles de dépendances indirectes consignés dans le fichier de verrouillage.

La documentation de confidentialité précise que les classements individuels sont visibles après révélation et que les participants peuvent exporter le résultat collectif.

## Validation et limites

Sept tests du moteur et 93 assertions d'intégration sur le Worker construit et une base D1 jetable. Les scénarios incluent douze invités sur le même réseau, vote partiel, fin de partie, inscription facultative conservant l'historique, droits administrateur, secret des votes, statistiques communes et limites d'authentification.

Contrôle de l'interface dans l'aperçu : création d'une salle avec le profil invité, affichage du QR, classement par clic, noms non classés, validation et téléchargement PNG. Le PNG obtenu a été ouvert et inspecté. Le signal de téléchargement du navigateur a expiré malgré la création effective du fichier ; son contenu et son horodatage ont permis de confirmer le résultat. Ce contrôle n'est pas une partie sur trois téléphones réels ni un test de charge.

Restent nécessaires avant commercialisation : activation du propriétaire avec son secret privé, service d'e-mail et domaine d'envoi vérifié, informations de l'éditeur/contact, restauration effectivement testée, alertes et charge. La CSP contient encore des autorisations inline. Ne pas présenter cette livraison comme une clôture de l'ensemble de l'audit ou de la roadmap.

## Dépendances après correction

Le contrôle `pnpm audit --prod` du 24 septembre 2026 signale 2 avis : 0 critique, 0 élevé, 1 modéré et 1 faible. Les deux avis restants concernent esbuild dans des dépendances optionnelles de drizzle-kit, outil de construction/migration. Ils ne sont pas assimilés à des failles démontrées du Worker. Leur retrait implique une mise à jour de cette chaîne de construction distincte ; ne pas lancer ses serveurs de développement sur un réseau public.
