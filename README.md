# Ma Santé v0.2.3.7 — correctifs terrain

Aujourd'hui
- Les prises réellement enregistrées « au besoin » sont maintenant affichées directement dans la liste principale de la journée.
- Exemple : une prise de Dafalgan Dolo enregistrée au besoin apparaît sous « Pris au besoin », avec heure, quantité et note.
- Les traitements configurés comme « Pris au besoin » restent séparés sous « Traitements au besoin disponibles ».
- Après l'enregistrement d'une prise au besoin, Aujourd'hui se rafraîchit immédiatement.

Traitements
- Liste entièrement reformattée sur le principe de Pharmacie :
  - première ligne = nom du traitement uniquement ;
  - deuxième ligne = dosage + posologie/périodicité + instruction ;
  - boutons Voir / Modifier / Supprimer séparés.
- Sur petit écran, les boutons passent sous le titre au lieu de comprimer/mélanger la ligne.

Sauvegardes
- L'horodatage `.habak` introduit en v0.2.3.6 est conservé.

Stockage
- IndexedDB conservé.
- Clé logique inchangée : ma-sante-v02001.
