Ma Santé v0.2.5.7 — alarmes du jour

- Au clic sur Enregistrer d'un traitement, Ma Santé recalcule les heures restantes du jour.
- Au clic sur Enregistrer d'une mesure, même synchronisation.
- Traitements et mesures à la même minute sont dédupliqués : une seule alarme par heure/minute.
- Aucun détail de santé n'est envoyé à MaSanteBridge : uniquement les heures restantes du jour.
- MaSanteBridge reste un exécuteur d'alarmes génériques.

Note : l'exécution automatique exacte à 03:05 ne peut pas être garantie par une PWA fermée ; elle nécessite une étape native séparée.
