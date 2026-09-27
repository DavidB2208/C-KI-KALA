# Tester C KI KA LA — v5.1, 27 septembre 2026

## Démarrer sur son ordinateur

1. Récupérer la dernière version de `main` ou le ZIP v5.1 ; extraire le ZIP.
2. Ouvrir un terminal dans le dossier contenant `package.json`.
3. Avec Node >=22.13 et pnpm 11.25.0 : `pnpm install --frozen-lockfile`, puis `pnpm dev`.
4. Ouvrir `http://localhost:5173` et garder le terminal ouvert.

La première exécution génère les secrets locaux et applique les migrations D1. Les suivantes conservent la configuration, les comptes et les parties. Aucune commande ne migre une base distante et aucun paiement n’est activé. `pnpm setup:local` et `pnpm db:migrate:local` restent disponibles séparément.

La commande ne doit pas être lancée en ouvrant un fichier HTML, via Live Server ou sur GitHub Pages : le jeu utilise une API et une base de données.

## Créer un compte

Ouvrir **Mon compte → Créer un compte**, saisir un pseudo, une adresse e-mail et un mot de passe d’au moins 12 caractères, puis confirmer le mot de passe. Conserver le code de récupération affiché. L’inscription ordinaire ne demande ni compte ChatGPT, ni clé de configuration, ni activation administrateur.

`owner@example.test` est réservé à l’administrateur local. Pour tester un compte joueur, utiliser une autre adresse. L’administration se configure séparément sur `/admin/activate` avec le fichier privé `.local/owner-activation.txt` créé lors du premier démarrage ; ne jamais publier ce fichier.

## Trois joueurs dans le même navigateur

1. Créer une salle dans le premier onglet avec le pseudo de l’hôte.
2. Dans la salle, cliquer **Ajouter un joueur dans un nouvel onglet**.
3. Saisir un deuxième pseudo, puis **Rejoindre sans compte**.
4. Revenir à l’onglet de l’hôte et utiliser le même bouton pour le troisième joueur.
5. Revenir à l’hôte, vérifier les trois pseudos, puis lancer la partie. Chaque onglet vote séparément.

Si vous avez déjà ouvert une fenêtre classique et saisi le code, choisir **Jouer comme un autre joueur** dans le dialogue de participation. Sans ce choix, les fenêtres classiques retrouvent volontairement le même profil : c’est le comportement normal d’une session connectée.

Un bandeau signale les onglets indépendants. Actualiser conserve leur joueur. Les liens de navigation et la création facultative d’un compte dans cet onglet conservent son historique. **Revenir au profil principal** retrouve le compte ou l’invité des fenêtres classiques ; cela ne supprime aucun compte. Garder les onglets invités ouverts pendant le test. Dupliquer manuellement un onglet peut copier sa session : utiliser le bouton dédié pour obtenir un nouveau joueur.

Ces onglets facilitent un test sur un appareil partagé ; ils ne constituent pas une isolation de sécurité entre personnes utilisant ce même appareil. Pour une vraie partie, chacun garde son écran pour préserver ses votes. Les tokens d’authentification restent dans des cookies HttpOnly ; seul un sélecteur non secret est conservé par onglet.

## Si l’inscription échoue encore

- Si une ancienne `.dev.vars` existe, elle n’est pas écrasée : vérifier `BETTER_AUTH_SECRET` (au moins 32 caractères aléatoires) et `CKK_APP_ORIGIN` (par exemple `http://localhost:5173`, sans chemin ni barre finale). Redémarrer après modification. Ne jamais envoyer ces secrets dans une capture ou un message.
- Si une migration échoue au démarrage, conserver la base et lire l’erreur du terminal. Une ancienne base créée manuellement sans registre de migrations nécessite une migration adaptée ou une nouvelle copie de développement ; ne pas supprimer les données pour masquer l’erreur.
- Si 5173 est occupé, arrêter l’autre serveur ou utiliser `pnpm dev --port 5174`, puis ouvrir l’adresse affichée. Le jeu ne change plus silencieusement de port.
- Si le formulaire reste bloqué, relever le message affiché et l’adresse utilisée. Les protections contre les origines étrangères restent actives ; une origine de production n’est jamais remplacée automatiquement par une adresse locale.
- Un navigateur normal et une fenêtre privée donnent aussi deux sessions différentes. Plusieurs fenêtres privées d’un même navigateur peuvent partager une seule session privée.

## Régression automatisée

`pnpm test:local` copie les sources dans un dossier temporaire sans secrets ni base, réutilise les dépendances installées, lance le vrai serveur de développement sur un port libre, crée un compte via HTTP, puis fait rejoindre trois joueurs partageant les mêmes cookies mais utilisant des onglets distincts. Il vérifie aussi l’alias de boucle locale et la conservation des sessions. La copie temporaire est supprimée en fin de test. La suite Worker utilise désormais une origine HTTPS et teste également la promotion d’un invité en compte et la déconnexion sans impact sur les autres onglets.
