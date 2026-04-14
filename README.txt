HALLILA : C KI KIA LA — version sans comptes, avec BDD optionnelle

Contenu :
- index.html
- styles.css
- app.js
- bg-music.wav
- schema.sql
- supabase-config.js

Ce que sauvegarde la BDD :
- personas
- sets de personas
- historiques de manches
- résultats finaux
- stats par pseudo
- stats par persona

Important :
- aucune table de compte, email ou mot de passe
- le jeu live reste hébergé par l’admin via PeerJS
- la BDD sert à la persistance des données non sensibles

Mise en route :
1. Déployer le site
2. Exécuter schema.sql dans Supabase
3. Remplir supabase-config.js
4. Recharger le site

Si supabase-config.js reste vide :
- le site marche quand même
- les données restent locales au navigateur

- écran de détail des stats par persona (clic sur un nom)
- meilleurs thèmes par persona
