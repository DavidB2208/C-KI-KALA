# C KI KA LA — décisions produit v5

25 septembre 2026. Cette version répond à la demande d’étendre le produit, y compris les groupes et paiements. Elle remplace les reports de périmètre de la v4 ; le document v4 reste un historique, pas la feuille de route actuelle.

## Décisions sur les 23 points

| Point du prompt | Décision et résultat |
| --- | --- |
| 1. Jeu social et mémoire du groupe | Squads privées, historique et souvenirs communs. La promesse reste factuelle : on conserve des parties, on ne prétend pas connaître une personne. |
| 2. Jouer → revenir → payer | Parcours de jeu gratuit, revanche commune, sauvegarde par compte, partage volontaire et page d’offres. Aucun achat pendant le vote. |
| 3. Préserver le jeu | Codes/QR, pseudos invités, 3–12 joueurs, classements S–E, votes secrets et reconnexion conservés. |
| 4. Sets, decks, packs | Sets = noms à classer ; decks = questions personnelles ; packs = catalogue du jeu. Les trois ont des usages distincts dans la création. |
| 5. Gratuit utile | 60 questions, trois packs, parties, sets, 20 decks de 50 questions, Squads, statistiques essentielles et partage gratuits. |
| 6. Party Pass | 2,99 € / 24 h, paiement unique, quatre packs Premium et deux ambiances pour les salles de l’hôte. Durée à partir du paiement vérifié. |
| 7. C KI KA LA+ | 4,99 €/mois ou 34,99 €/an. Même contenu Premium, ambiances et activité personnelle par mois/pack. Résiliation via portail Stripe. |
| 8. Packs séparés | Quatre packs de 20 questions chacun, à 2,99 € : Arc entre potes, Campus, Fin du monde, Red Flags. Pas de promesse de contenu futur. |
| 9. Squads | Création gratuite, description, invitation expirante/révocable, 30 membres, 10 Squads par compte, transfert de propriétaire, exclusion, retour autorisé, départ et suppression. Statistiques communes sous accord unanime. |
| 10. Profils/XP/badges | Profils et couleurs existants, badges de participation, XP et niveau calculés sur les mêmes parties conservées. Pas de classement de valeur sociale ni de pouvoir à acheter. |
| 11. Partage | PNG tier-list et Story avec aperçu, noms masqués par défaut ; partage natif si pris en charge. Aucun résultat public automatique. Pas de bouton WhatsApp prétendant envoyer une image sans support du navigateur. |
| 12. Inscription après partie | Toujours facultative. La première inscription sur le navigateur conserve l’identité et les parties invitées. Pas de compte ChatGPT nécessaire. |
| 13. Stats | Moyennes exactes, distributions, questions jouées, vrais volumes, progression et activité Premium. « Rival », « meilleur ami », diagnostics et pourcentages de personnalité écartés. |
| 14. Avis questions | Avis positif/négatif modifiable ou retirable après révélation, privés individuellement, synthèse dans l’administration. Aucune suppression automatique au premier avis. |
| 15. Publicités | Écartées à ce stade : aucun partenaire, revenu démontré ou dispositif de consentement ; la coupure de soirée dégraderait la boucle principale. |
| 16. Parrainage | Reporté : récompenses fraudables et coût avant validation de la rétention. Les invitations simples fonctionnent déjà. |
| 17. Marketplace | Reportée : modération, droits d’auteur, rémunération et gestion des vendeurs disproportionnés pour le lancement. Les decks privés couvrent la personnalisation. |
| 18. Sponsors | Reportés : aucune audience mesurée ni partenariat réel. Aucun faux logo ou pack sponsorisé. |
| 19. Phases | Stabilisation + groupes + contenu + intégration de vente réalisés. Activation commerciale après essais du compte marchand, exploitation et informations vendeur. |
| 20. Priorités | Jeu et confidentialité avant friction commerciale. Les offres sont facultatives ; le compte n’est pas demandé pour rejoindre une salle. |
| 21. Mémoire collective | Partages vers une Squad après accord de chaque participant, retrait possible. Départ/exclusion annule l’accord et masque les parties concernées au groupe. |
| 22. Ordre des revenus | Pass, Plus et packs implémentés. Ads, vente de cosmétiques séparée, sponsors et marketplace attendent une preuve de besoin. |
| 23. Rejouer immédiatement | Revanche commune conservée, y compris decks copiés dans la partie. Le nouvel hôte doit disposer des droits Premium pour une nouvelle salle. |

## Critiques qui changent volontairement le prompt

- Les Squads ne sont pas derrière un abonnement : elles doivent encourager le retour des amis. Les invités ne sont jamais contraints de s’inscrire pour une partie associée à un groupe.
- Une partie n’est partagée avec une Squad que si tous ses participants sont membres et acceptent. Les nouveaux membres de cette Squad verront alors les statistiques collectives, mais pas les bulletins des soirées auxquelles ils n’ont pas joué.
- Un S signifie « correspond beaucoup à la question », pas « meilleur joueur ». Les moyennes de questions différentes restent présentées avec cette limite.
- Les niveaux/XP sont des indicateurs de participation sur l’historique conservé (100 parties, un an au maximum), pas une progression acquise à vie. Cela évite des compteurs incompatibles avec la purge et la suppression des comptes.
- Acheter un pack alors qu’il est déjà inclus dans un accès actif est bloqué pour limiter les achats redondants. Le cumul d’abonnements est bloqué ; changer d’offre demande de terminer l’abonnement existant.
- Aucun enregistrement de carte dans le jeu. Le navigateur ne décide jamais qu’un utilisateur a payé.
- Les prix reprennent le prompt et constituent le catalogue proposé, pas une preuve de validation du marché. Les trois créateurs gardent la décision d’ouvrir les ventes et de modifier le catalogue avant ouverture.

## Ce qui est effectivement livré

Pages `/squads`, `/decks`, `/offers`, `/terms`, création enrichie, catalogue 7 packs, thèmes Néon/Aurora/Sunset, accord de partage au bilan, compte/stats/admin enrichis. Tables D1, migrations additives, limites, validation, contrôle de propriété, journaux de paiement, événements Stripe signés et dédupliqués, droits temporaires ou permanents, résiliation, remboursement intégral et litige.

Le système de paiement est codé et testé avec un fournisseur simulé. **Il n’est pas activé sur le site sans configuration du vendeur et de Stripe.** Voir `PAIEMENTS-V5.md` pour l’activation et `VALIDATION-V5.md` pour ce qui a réellement été vérifié.
