# Vonia

Appli web pour iPhone (installable sur l'écran d'accueil) : ta musique, tes vidéos YouTube, tes récaps d'écoute.
Style dancehall aux couleurs reggae.

## Installer Vonia sur l'iPhone
1. Ouvre l'adresse de Vonia dans **Safari**.
2. Touche **Partager**, puis **« Sur l'écran d'accueil »**.
3. Lance Vonia depuis son icône.

## Onglets
- **Écouter** : import de fichiers audio depuis l'app Fichiers (titre, artiste, genre et pochette lus dans les étiquettes MP3, sinon dans le nom « Artiste - Titre »), lecture hors connexion, playlists, aléatoire, répétition, petit lecteur, lecteur plein écran, commandes sur l'écran verrouillé, reprise là où on s'est arrêté.
- **YouTube** : coller un lien, lecteur YouTube officiel dans l'appli, favoris, playlists de vidéos, historique ; recherche avec une clé API Google (Réglages → Clé API).
- **Récap** : carte « Actuellement » mise à jour après chaque écoute, et récaps animés de la semaine, du mois et de l'année (temps d'écoute, artistes, titres, moments, chiffres, profil d'écoute, partage). Une écoute compte après 30 s. Les comparaisons avec les autres auditeurs sont des estimations.
- **Notube** : ouvre https://notube.lol dans Safari.
- **Réglages** : pseudo, clé API YouTube, stockage, effacement de l'historique, mises à jour.

Toutes les données restent sur le téléphone (IndexedDB).

## Mettre à jour l'appli
Après une modification, change `APP_CACHE` dans `sw.js` (ex. `vonia-app-v2`) et `APP_VERSION` dans `js/app.js`.

## Fichiers
- `index.html`, `css/app.css` : la page et le style.
- `js/ui.js` (outils d'interface), `js/db.js` (stockage), `js/tags.js` (lecture des étiquettes MP3), `js/player.js` (lecteur audio et suivi des écoutes), `js/library.js` (bibliothèque, onglet Écouter, lecteurs), `js/youtube.js`, `js/recap.js`, `js/app.js` (navigation, Notube, Réglages).
- `sw.js` : fonctionnement hors connexion.
- `icons/` : icône « Soleil sonore » (`icon.svg` est la source).
- `fonts/` : polices Anton et Rubik (licence SIL Open Font License, voir les fichiers LICENSE).
