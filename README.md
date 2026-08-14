# Ma Santé v0.2.3.9 — correctif Voir traitements

- La liste compacte de v0.2.3.8 est conservée.
- Correctif du bouton « Voir » dans Traitements.
- Cause : v0.2.3.8 appelait par erreur une fonction `openInfoModal()` inexistante.
- « Voir » utilise de nouveau la fenêtre `treatmentDetailModal` existante.
- Présentation structurée conservée : libellé / valeur + Posologie séparée.
- Les prises au besoin, sauvegardes horodatées et IndexedDB restent inchangés.
