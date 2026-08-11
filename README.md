# Ma Santé v0.2.0.3

Correctif ciblé images.

- Les données v0.2.0.2 sont conservées (même clé locale).
- Les nouvelles photos sont stockées dans IndexedDB, pas dans localStorage.
- Les anciennes photos encodées dans les données sont migrées vers IndexedDB lorsque possible.
- Smartphone : « Prendre une photo » et « Choisir une image / un fichier ».
- Voir, remplacer ou supprimer une photo.
- Une erreur liée à la photo ne doit plus bloquer l'enregistrement des autres données du médicament.
- Le correctif de la croix Péremption est conservé.

Note : les emplacements proposés par Android (appareil, OneDrive, etc.) dépendent du sélecteur de fichiers et des fournisseurs installés.
