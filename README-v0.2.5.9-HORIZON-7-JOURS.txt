Ma Santé v0.2.5.9 — Alarmes sur horizon roulant de 7 jours

- Ma Santé reste la seule source de logique santé.
- Au clic sur Enregistrer (traitement ou mesure), Ma Santé recalcule les timestamps utiles des 7 prochains jours.
- Les traitements et mesures qui tombent à la même date/heure/minute sont dédupliqués.
- Aucun détail de santé n’est transmis à MaSanteBridge.
- Ma Santé ouvre MaSanteBridge une seule fois avec :
  masante://alarm?ats=YYYY-MM-DDTHH:mm,YYYY-MM-DDTHH:mm,...
- Pour aujourd’hui, les heures déjà passées ne sont pas envoyées.
- Pour les six jours suivants, toutes les heures planifiées sont envoyées.

MaSanteBridge doit accepter les timestamps jusqu’à 7 jours dans le futur et refuser les dates au-delà.
