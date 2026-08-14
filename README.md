# Ma Santé v0.2.3.6 — retours terrain

Corrections issues de la liste du 13.08.2026 :

1. Aujourd'hui
- Ajout de la périodicité « Pris au besoin » dans les traitements.
- Les traitements actifs marqués « Pris au besoin » apparaissent désormais dans Aujourd'hui, sous une rubrique dédiée « Au besoin ».
- Le bouton « Pris » ouvre directement la saisie de la prise correspondante.
- Le bouton général « Au besoin » reste disponible pour les prises spontanées depuis la Pharmacie.

2. Sauvegarde / transfert
- Les sauvegardes portent désormais l'extension `.habak`.
- Nom horodaté en heure locale : `Ma-Sante_AAAA-MM-JJ_HH-MM.habak`.
- L'import accepte `.habak` et les anciens `.json`.
- Le sélecteur système de fichiers reste utilisé : sur Smartphone, OneDrive peut être choisi comme emplacement/source via Android ; sur Windows, le dossier OneDrive synchronisé est accessible normalement.
- Aucun accès automatique à OneDrive n'est ajouté : il nécessiterait l'authentification Microsoft/Entra que nous avons décidé de ne pas imposer.

3. Traitements
- Vue de liste simplifiée : un traitement = une ligne de titre, comme dans Pharmacie.
- Posologie, périodicité, instructions et remarques restent disponibles via « Voir » et « Modifier ».

Stockage
- IndexedDB de v0.2.3.5 conservé.
- Clé logique utilisateur inchangée : `ma-sante-v02001`.
