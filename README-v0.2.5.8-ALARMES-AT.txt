Ma Santé v0.2.5.8 — Alarmes du jour

- Au clic sur Enregistrer (traitement ou mesure), Ma Santé recalcule les heures restantes du jour.
- Traitements et mesures à la même minute sont dédupliqués.
- Aucun détail de santé n'est transmis au bridge.
- Une seule ouverture de MaSanteBridge est faite avec une liste de timestamps exacts :
  masante://alarm?ats=YYYY-MM-DDTHH:mm,YYYY-MM-DDTHH:mm,...

MaSanteBridge doit accepter le paramètre "ats" et appeler scheduleExactAlarm() pour chaque timestamp.
Le filtre "aujourd'hui seulement" reste appliqué dans scheduleExactAlarm().
