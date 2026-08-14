# Ma Santé v0.2.4.2 — export/import

Changements :
- « Télécharger une sauvegarde » devient « Exporter une sauvegarde ».
- Suppression du bouton « Partager / OneDrive », qui a renvoyé « Permission denied » lors du test sur Smartphone.
- À l’export, Ma Santé essaie désormais d’utiliser le sélecteur « Enregistrer sous… » du navigateur (`showSaveFilePicker`) lorsqu’il est disponible.
- Si ce sélecteur est disponible, l’utilisateur choisit lui-même la destination ; OneDrive pourra être choisi uniquement s’il est proposé par le système/navigateur.
- Si le navigateur ne fournit pas ce mécanisme, Ma Santé revient automatiquement au téléchargement classique dans Téléchargements.
- « Importer une sauvegarde » reste inchangé et accepte `.habak`.
- Mise en page de « Plus » corrigée pour éviter le débordement horizontal sur Smartphone/Fold.

Important :
La PWA ne peut pas forcer OneDrive comme destination. Cette version teste proprement la meilleure possibilité offerte par le navigateur, avec repli sûr sur Téléchargements.

Fonctions validées conservées :
- Traitements : titre + deuxième ligne.
- Vue « Voir » structurée.
- Prises au besoin dans Aujourd’hui.
- Sauvegardes horodatées.
- IndexedDB / clé ma-sante-v02001.
