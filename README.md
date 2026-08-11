# Ma Santé v0.2.0.5 — récupération

Correctifs ciblés :

1. Contacts et Ordonnances
- La version recherche les données dans toutes les clés locales connues des versions récentes.
- Les Contacts et Ordonnances retrouvés sont fusionnés dans la base actuelle.
- Les doublons par identifiant ne sont pas recréés.
- La clé de stockage principale reste `ma-sante-v02001`.

2. Aujourd'hui — Tout enregistrer
- Le bouton « Tout enregistrer à xx:xx » reste affiché pour chaque groupe horaire.
- Le fonctionnement ne dépend plus des variables automatiques créées par le navigateur à partir des id HTML.
- Choix : heure prévue, heure actuelle ou autre heure.
- Après enregistrement, Aujourd'hui et le stock Pharmacie sont immédiatement rafraîchis.

3. Sécurité
- Les prestations ne figurent pas dans « Pris au besoin ».
- Les nouveaux champs Ordonnances et Pharmacie sont explicitement liés au JavaScript.
