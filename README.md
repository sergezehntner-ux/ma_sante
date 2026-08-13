# Ma Santé v0.2.2.9

Corrections terrain :
- Aujourd’hui : navigation libre vers les jours futurs ;
- les jours futurs affichent les traitements et mesures prévus sans permettre de les marquer comme déjà pris ;
- bouton « Ajouter un traitement isolé ce jour » : ouvre le masque Traitement avec début = fin = journée future choisie ;
- Contacts : formatage téléphonique en direct, notamment Suisse `+41 xx xxx xx xx`, plus regroupement lisible pour les autres indicatifs ;
- « Autre… » vide systématiquement le champ libre quand l’utilisateur le choisit manuellement ;
- Ordonnances : « Voir PDF » utilise désormais le lecteur PDF intégré de Ma Santé (PDF.js + canvas), sans dépendre du lecteur PDF d’Edge mobile ;
- Pharmacie : le champ Type accepte des types personnalisés (Ergothérapie, Physiothérapie, Consultation dentaire, etc.) tout en conservant la logique interne « prestation » ;
- cache-busting 0229 ;
- clé de stockage inchangée : `ma-sante-v02001`.
