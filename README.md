# Ma Santé v0.2.0.4

Contacts :
- Personne de référence affichée avant Spécialité/fonction.
- Téléphone affiché après la localité.
- Prescripteur : nom/établissement + personne de référence + spécialité.

Ordonnances :
- Une ordonnance contient 1 à x médicaments/prestations.
- Tri par date d'émission puis prescripteur.
- Liste : date, prescripteur, spécialité.
- Retrait unique ou plusieurs retraits jusqu'à une date.
- Anciennes ordonnances à un seul médicament migrées automatiquement.

Pharmacie :
- Nouveau type : Médicament/produit ou Mesure/prestation.
- Les prestations n'ont ni stock, ni lots, ni péremption.
- Elles peuvent être prescrites dans une ordonnance.
- Les traitements restent réservés aux médicaments/produits.
- Croix Péremption sur la même ligne que la date et vide uniquement la date.

La clé de stockage reste inchangée.
