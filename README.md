# Ma Santé v0.2.2.5

Correctif rapports « Prises des médicaments et mesures »

- le tableau mensuel est maintenant le rendu principal de « Voir le rapport » ;
- une ligne par traitement / mesure ;
- colonnes 1 à 28/29/30/31 selon le mois ;
- chaque case affiche heure + quantité/valeur réellement enregistrée ;
- plusieurs prises le même jour sont empilées dans la même case ;
- `*` signale une prise au besoin / spontanée ;
- une période annuelle génère simplement 12 tableaux mensuels successifs ;
- impression des rapports de prises en A4 paysage ;
- les anciens rapports de prises enregistrés sont régénérés dans ce nouveau format à partir de leurs critères lorsqu'on les ouvre ou imprime ;
- cache-busting corrigé : app.js et styles.css utilisent v=0225.

La clé de stockage utilisateur reste inchangée.
