# Ma Santé v0.1.7.2

Correctif cache/import.

- `app.js` devient `app-0172.js` et `styles.css` devient `styles-0172.css` afin d’empêcher le navigateur de réutiliser l’ancienne v0.1.7.
- cache PWA renouvelé (`ma-sante-v0172`).
- sauvegarde locale et rendu écran sont désormais traités séparément.
- correction défensive de tout appel erroné `treatmentProduct(...)`.
- les données locales des versions précédentes, y compris v0.1.7.1, sont reprises.

Après mise à jour GitHub, ouvrir d’abord l’URL Pages dans le navigateur puis actualiser une fois.
