Ma Santé v0.2.4.11 — correctif démarrage

Cause du plantage de v0.2.4.10 :
- l'index optimisé des 11 009 médicaments était construit avant la déclaration du catalogue lui-même ;
- cela provoquait une erreur JavaScript dès le démarrage et interrompait tout le reste de l'application.

Correction :
- le catalogue est d'abord déclaré ;
- l'index est construit ensuite ;
- l'aide « ? » reste au-dessus du masque Pharmacie ;
- l'optimisation de recherche de v0.2.4.10 est conservée ;
- aucune donnée utilisateur ni fonction métier n'est modifiée.
