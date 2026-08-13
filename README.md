# Ma Santé v0.2.3.5 — stockage étendu

- Migration automatique du gros état Ma Santé de localStorage vers IndexedDB.
- IndexedDB devient le stockage principal après initialisation.
- L'ancienne copie localStorage n'est supprimée qu'après migration réussie.
- Importations volumineuses (historique TOM, documents/PDF) ne dépendent plus du petit quota localStorage.
- Demande de stockage persistant au navigateur lorsque disponible.
- Compendium : correction de la liste directe. Une entrée disposant d'une fiche Compendium connue est reconnue même si sa classification historique diffère.
- Accès Pharmacie → Compendium conservé.
- Clé logique inchangée : ma-sante-v02001.
