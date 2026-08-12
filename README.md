# Ma Santé v0.2.1.1 — Rapports adaptatifs + correction logo

RAPPORTS
Prises de médicaments :
- période manuelle Du/Au ;
- Semaine passée ;
- Semaine en cours ;
- Mois passé ;
- Mois en cours ;
- Toutes les prises ;
- Tous les médicaments ou un médicament précis.

Contacts :
- aucune date ;
- Tous / uniquement référents ;
- Spécialité (valeurs réellement existantes) ;
- Lieu (valeurs réellement existantes) ;
- Nom / établissement (valeurs réellement existantes).

Pharmacie :
- aucune date ;
- Type (types réellement existants) ;
- Péremption : toutes, périmées, proches sous 30 jours, ou périmées + proches.

LOGO / GALERIE
- le logo affiché dans l'en-tête est intégré directement dans index.html ;
- le favicon est également intégré directement ;
- suppression des multiples déclarations favicon/apple-touch ;
- le manifeste ne garde que icon-192.png et icon-512.png ;
- le service worker ne met plus en cache toutes les tailles d'icône ;
- les tailles d'icônes inutilisées sont retirées du paquet.

La clé de stockage des données utilisateur reste inchangée.
