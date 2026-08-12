# Ma Santé v0.2.2.3

Correction de la consultation des journées passées :

- Aujourd'hui reste l'écran opérationnel avec le planning.
- Pour une date passée, Ma Santé affiche par défaut uniquement les prises et mesures réellement enregistrées ce jour-là.
- Une journée sans enregistrement affiche clairement « Aucune prise enregistrée » / « Aucune mesure enregistrée ».
- Bouton « Ajouter une prise oubliée » : propose uniquement les prises prévues ce jour et encore non enregistrées.
- Bouton « Afficher les prises prévues ce jour » : permet, si nécessaire, de voir le planning historique calculé et d'enregistrer plusieurs prises.
- Le planning n'est plus présenté comme s'il s'agissait d'un historique réel.

Cache :
- app.js et styles.css portent un numéro de version dans leur URL ;
- le service worker utilise un mode réseau prioritaire pour index/app/styles afin d'éviter les mélanges de versions.

La clé de stockage utilisateur reste inchangée.


- Import historique TOM : fusionne les prises et mesures détaillées sans remplacer les données actuelles.
