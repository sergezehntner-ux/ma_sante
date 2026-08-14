# Ma Santé v0.2.4.1 — transfert simplifié

Sauvegardes / échanges Smartphone ↔ Notebook
- Trois actions clairement séparées :
  - Télécharger une sauvegarde
  - Partager / OneDrive
  - Importer une sauvegarde
- Dossier conseillé affiché dans l’application :
  OneDrive → Apps → Ma Santé → Sauvegardes
- Les sauvegardes `.habak` gardent le format horodaté :
  Ma-Sante_AAAA-MM-JJ_HH-MM.habak
- Chaque sauvegarde contient aussi des métadonnées :
  appareil d’origine (Smartphone/Notebook), date/heure locale, version Ma Santé.
- Sur Smartphone, « Partager / OneDrive » utilise la feuille de partage du système lorsqu’elle accepte les fichiers.
  OneDrive peut alors être choisi si le système le propose.
- Si le partage de fichiers n’est pas disponible, Ma Santé revient automatiquement au téléchargement classique.
- L’importation accepte `.habak`, `.json` et les fichiers génériques afin de ne pas masquer OneDrive dans certains sélecteurs Android.
- Avant remplacement, Ma Santé affiche :
  nom du fichier, appareil d’origine, date/heure, nombre de traitements, articles, prises, contacts et ordonnances.
- L’import ne se fait qu’après confirmation explicite.
- Après import, toute l’interface est rafraîchie immédiatement.

Limite volontaire :
- Pas de synchronisation silencieuse OneDrive : elle exigerait l’authentification Microsoft/Entra.
- Cette version réduit le transfert à quelques clics sans compte Azure ni accès général au OneDrive.

Autres fonctions inchangées :
- Traitements v0.2.4.0
- Prises au besoin
- IndexedDB
- clé logique ma-sante-v02001
