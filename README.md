# Vonia

Appli web pour iPhone (installable sur l'écran d'accueil) : ta musique, tes vidéos YouTube, tes récaps d'écoute.
Style dancehall aux couleurs reggae.

## Installer Vonia sur l'iPhone
1. Ouvre l'adresse de Vonia dans **Safari**.
2. Touche **Partager**, puis **« Sur l'écran d'accueil »**.
3. Lance Vonia depuis son icône.

## Onglets
- **Écouter** : tes fichiers audio (hors connexion), playlists, lecteur. *(étape 2)*
- **YouTube** : coller un lien, favoris, playlists ; recherche plus tard avec une clé API Google. *(étape 3)*
- **Récap** : « Actuellement » mis à jour après chaque écoute, puis récaps animés du mois, de la semaine et de l'année. *(étape 5)*
- **Notube** : ouvre https://notube.lol dans Safari.
- **Réglages**.

## Mettre à jour l'appli
Après une modification, change `APP_CACHE` dans `sw.js` (ex. `vonia-app-v2`) et `APP_VERSION` dans `js/app.js`.

## Fichiers
- `index.html`, `css/app.css`, `js/app.js` : l'appli.
- `sw.js` : fonctionnement hors connexion.
- `icons/` : icône « Soleil sonore » (`icon.svg` est la source).
- `fonts/` : polices Anton et Rubik (licence SIL Open Font License, voir les fichiers LICENSE).
