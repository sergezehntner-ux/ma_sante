Ma Santé v0.2.5.4 — Synchronisation Traitements → MaSanteBridge

- index.html charge désormais app-0254.js.
- À l’enregistrement ou à la modification d’un traitement, Ma Santé construit un payload contenant les horaires et règles de périodicité puis ouvre masante://alarm?payload=...
- Les traitements PRN (« au besoin ») sont exclus des alarmes automatiques.
- Le format times= reste disponible côté MaSanteBridge pour les tests manuels.

Note : l’annulation d’anciennes alarmes lors de la suppression/modification d’un traitement sera traitée dans une étape suivante.
