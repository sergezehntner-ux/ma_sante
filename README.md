# Ma Santé v0.1.8.3

Correctif du lecteur d'ordonnances scannées.

- `Voir PDF` n'utilise plus le lecteur PDF intégré de Microsoft Edge.
- Ma Santé rend le PDF lui-même avec PDF.js dans une fenêtre interne.
- Navigation page précédente / suivante.
- Zoom + / -.
- Le PDF reste stocké localement dans IndexedDB.
- Les données de v0.1.8.2 et versions antérieures sont reprises automatiquement.

PDF.js est chargé par Ma Santé depuis le CDN cdnjs au moment où l'application est chargée. Une connexion Internet est donc nécessaire au moins pour charger ce composant du lecteur dans cette version.
