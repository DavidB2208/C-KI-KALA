# Architecture et fonctionnement

## Requête et identité

React/Vinext sert l’interface et les routes `/api/*` dans un Worker Cloudflare. D1 conserve les données. Le serveur est l’autorité sur les droits, le temps, les votes et les résultats. Les valeurs envoyées par le navigateur ne permettent pas d’usurper un membre ou de sélectionner un autre propriétaire de données.

Les comptes utilisent Better Auth 1.7.5 avec son adaptateur D1 natif. Les mots de passe sont hachés avec scrypt, jamais stockés en clair. Les sessions durent sept jours sans renouvellement implicite, sont révocables en base et utilisent un cookie HttpOnly / SameSite=Lax / Secure sur HTTPS. L’API ne renvoie pas le jeton dans ses réponses JSON. Les en-têtes d’identité ChatGPT sont ignorés. Un site publié avec accès public permet d’entrer sans compte ChatGPT ; les données privées exigent toujours une session C KI KA LA.

L’API expose uniquement les opérations autorisées de Better Auth par une enveloppe contrôlée. Inscription et connexion sont limitées par IP et empreinte d’e-mail. Le mot de passe fait 12 à 128 caractères. Un e-mail non vérifié ne donne aucun privilège. Aucun rattachement automatique de comptes par e-mail ni mécanisme de « premier inscrit administrateur » n’existe.

Un code de récupération aléatoire de 256 bits est affiché une fois ; seul son SHA-256 est enregistré. Le remplacement du mot de passe, la révocation des sessions et la rotation du code sont un lot transactionnel conditionné par l’ancienne empreinte. Les renouvellements de code, changements de mot de passe et suppressions nécessitent le mot de passe courant. Sans mot de passe ni code de secours, aucune récupération automatique n’est proposée tant qu’un prestataire d’e-mails n’est pas raccordé.

L’activation du propriétaire nécessite son e-mail réservé, un code aléatoire distinct dont seul le SHA-256 est configuré côté serveur et une échéance non dépassée. Un enregistrement singleton empêche sa réutilisation. Une activation interrompue avant l’attribution du rôle peut reprendre après authentification avec le mot de passe déjà choisi. Le profil historique explicitement désigné dans la configuration est rattaché à ce compte, avec ses données. L’ancien champ `auth_subject` est conservé uniquement pour la migration et ne sert plus à authentifier.

Un invité reçoit un jeton aléatoire de 256 bits dans un cookie HttpOnly / SameSite=Lax ; HTTPS ajoute Secure et le préfixe `__Host-`. Seul son SHA-256 est conservé, pendant 30 jours. La transformation du premier profil invité en compte révoque ces sessions. Les parties invitées ne sont pas fusionnées automatiquement avec un compte déjà existant.

Les mutations vérifient Origin, Sec-Fetch-Site lorsqu’il est présent, un en-tête propre au jeu et le type JSON. Le corps est limité à 16 Ko. Les requêtes SQL utilisent des paramètres liés. Les réponses API ne sont pas mises en cache. Les en-têtes de sécurité limitent les sources de ressources et interdisent les objets embarqués, la caméra, le micro et la géolocalisation. La CSP accepte encore les scripts/styles inline requis par le rendu du framework ; un passage à des nonces est un chantier de durcissement.

## Données

| Table | Contenu |
| --- | --- |
| `profiles` | Pseudo, couleur, lien au compte, rôle et suspension |
| `auth_user` | Identité interne, e-mail déclaré et statut de vérification |
| `auth_account` | Identifiant du fournisseur credential et empreinte scrypt |
| `auth_session` | Sessions Better Auth révocables et échéances |
| `auth_verification` | Table réservée au mécanisme Better Auth |
| `auth_recovery` | Empreinte du code de récupération |
| `admin_bootstrap` | Activation unique du propriétaire |
| `admin_audit` | Consultations détaillées et actions administrateur |
| `guest_sessions` | Empreinte du jeton invité, profil, expiration |
| `rooms` | Réglages, état, hôte, délai, éléments et participants figés |
| `members` | Identité dans une salle, état et dernière présence |
| `rounds` | Question de chaque manche et indicateur de manche passée |
| `ballots` | Un vote par membre et manche, ou abstention |
| `saved_sets` | Sets privés du propriétaire |
| `proposals` | Une proposition modifiable par membre et manche |
| `question_reports` | Signalement visible à l’hôte sous forme de compteur |
| `rate_limits` | Compteurs de limitation à durée courte |

Les noms des participants sont figés à l’entrée dans une salle. L’export contient le profil, les participations, les votes émis et les sets du demandeur. La suppression retire l’identité Better Auth, ses sessions et son code de récupération, le profil et les sets, remplace les noms par « Joueur supprimé » dans les participations et les cibles, et enlève le lien d’identité. Les classements collectifs restent consultables par les autres participants. Un texte libre saisi par autrui ne peut pas être automatiquement identifié comme une donnée du profil supprimé.

## Administration

Chaque requête `/api/admin/*` relit le rôle côté serveur. Les tableaux sont paginés et la recherche de joueurs accepte un pseudo ou un e-mail. Le propriétaire consulte les profils, participations, sets, questions et signalements. Les bulletins nominatifs sont accessibles uniquement pour les salles terminées ou fermées. L’interface ne donne accès ni aux empreintes de mot de passe, ni aux sessions, ni aux codes de récupération.

Une suspension exige de ressaisir le mot de passe administrateur, révoque les sessions et empêche une nouvelle connexion. La réactivation ne recrée aucune session. Le compte propriétaire ne peut pas être suspendu ni supprimé par cette interface ; un transfert de propriété reste une opération de maintenance, à implémenter avant d’ajouter plusieurs administrateurs. Les consultations détaillées et suspensions sont journalisées.

## Cycle d’une partie

`lobby → voting → reveal → voting … → finished`. En boîte à thèmes, `choosing` précède chaque vote. Une salle sans participant peut devenir `closed`.

- Le démarrage fige les participants et les cibles en une écriture SQL conditionnelle.
- Les votes ne changent plus après validation. Une contrainte unique empêche les doubles soumissions, même simultanées.
- Les membres ne lisent que leur propre bulletin avant la révélation. Après la révélation, les participants voient les agrégats et les bulletins nominatifs dans la salle. Les statistiques de Squad exposent uniquement les agrégats, après accord unanime.
- Le serveur refuse un vote après le délai. Le dernier vote ou une présence périodique déclenche la révélation ; une lecture seule n’écrit pas en base.
- L’hôte pilote la suite ; les écritures vérifient aussi son identité au moment de la modification en base.
- Quitter transfère le rôle. Un autre participant peut le reprendre après 90 secondes sans présence de l’hôte.
- Les statistiques sont recalculées depuis les parties terminées : aucun compteur cumulatif ne peut être incrémenté deux fois par une double action.

## Exploitation et limites connues

- Actualisation de la salle toutes les 2,5 secondes ; présence toutes les 10 secondes. Il s’agit de polling, pas de WebSocket. Mesurer le coût D1 et la latence à plusieurs salles simultanées avant une ouverture large.
- Statistiques sur les 100 dernières parties terminées accessibles, avec conservation des salles pendant un an. Le nettoyage physique est progressif et déclenché par la création d’une salle ; prévoir une purge planifiée si une échéance physique stricte est nécessaire.
- Limites actuelles : 12 joueurs, 12 éléments par set, 50 sets par compte, trois salles actives récentes par hôte. Les mutations sont limitées par IP et identité ; un réseau partagé peut atteindre la limite IP. Aucune protection DDoS ou anti-abus externe n’est promise par le code.
- Le code de salle est une invitation : pas de liste de contacts, ni preuve que la personne est réellement un ami. L’hôte peut exclure avant le démarrage. Après démarrage, il peut passer les questions ; chacun peut s’abstenir ou quitter.
- Le signalement avertit l’hôte et apparaît dans l’administration. Il n’existe pas encore de service humain de modération, de messagerie ou de traitement automatisé des signalements.
- Les packs sont versionnés dans le code. Les décisions créatives restent à l’équipe ; aucune IA ne génère ou ne modifie des questions en production.
- Authentification hébergée, accessibilité avec lecteurs d’écran, charge, restauration d’une sauvegarde et audit indépendant doivent être validés avant une ouverture commerciale. Les tests automatiques ne prouvent pas une sécurité absolue.

## Vérifications reproductibles

`pnpm test` vérifie sept groupes de propriétés du moteur. `pnpm test:integration`, après compilation, vérifie les scénarios contre le Worker réel et D1 : comptes indépendants, activation propriétaire et migration, récupération, révocation, suspension, accès croisés, cookies, promotion invité, votes invalides et simultanés, confidentialité, calculs, questions passées, expiration, reconnexion, export et suppression. Le navigateur couvre la création d’une salle/QR, l’essai de classement et le rendu mobile à 390 px. Ces vérifications ne constituent pas un test de charge ni un audit externe.

## Extension v5

`lib/squads-server.ts` gère les groupes privés avec contrôle de membre et de propriétaire. Les invitations contiennent 256 bits aléatoires ; seule l’empreinte est en base. Leur lien utilise un fragment d’URL. Les consentements sont propres à chaque participation ; une requête exclut toute partie dont un participant manque, refuse ou a quitté la Squad. Aucun accès à une Squad ne donne l’accès à une salle privée.

`lib/decks-server.ts` gère les questions privées. Les salles enregistrent leur propre copie ; un deck supprimé ne casse pas la partie ou sa revanche. Les questions Premium intégrales restent dans le code serveur ; le client ne reçoit que des exemples du catalogue.

`lib/billing-server.ts` gère configuration, checkout, portail, signatures, événements et droits. D1 conserve les commandes, clients de paiement, abonnements et droits avec mode test/live. Une lease par compte sérialise les opérations Stripe ; la signature et la relecture des objets Stripe restent les autorités du paiement. Les droits sont contrôlés à la création et au démarrage de la salle, sans interrompre un jeu commencé. Détails et limites : PAIEMENTS-V5.md.
