Ma Santé v0.2.4.17 — correction réelle du dédoublonnage Contacts

Cause identifiée :
- la v0.2.4.16 contenait bien la bonne logique de dédoublonnage,
  mais index.html chargeait encore app.js?v=02415 et styles.css?v=02415.
- le navigateur pouvait donc continuer à exécuter l'ancien JavaScript.

Correction :
- app.js et styles.css passent réellement à ?v=02417 ;
- le cache du service worker passe à v02417 ;
- la liste « Nom / établissement » est construite exclusivement à partir
  des valeurs distinctes du champ Nom / établissement, sans Personne de référence.
- les sélecteurs de prescripteur/exécuteur conservent, eux, la combinaison utile contact + référence.
