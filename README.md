# Ma Santé v0.1.3

Correctif du formulaire Traitements.

Le bouton Enregistrer utilise maintenant explicitement les champs du formulaire au lieu de dépendre des variables globales créées automatiquement par le navigateur. Cela corrige notamment l'erreur `Cannot read properties of undefined (reading 'trim')` observée sur Edge/Android.

Les données locales des versions précédentes restent récupérables.
