Ma Santé v0.2.4.20 — quittances corrigées

Base : v0.2.4.18 stable (la v0.2.4.19 défectueuse n'est pas utilisée).

Aujourd'hui
- Les deux fonctions coexistent après une confirmation :
  • Annuler = supprime la quittance, restaure le stock si nécessaire et remet la prise en attente.
  • Modifier = ouvre Pris / Pas nécessaire / Pas pris / À prendre plus tard + Pourquoi ?
- Le texte sous la confirmation globale explique cette différence.
- Une prise annulée n'est donc plus biffée : elle redevient une prise en attente.

Rapports
- Les prises planifiées des jours passés sans quittance sont calculées au moment du rapport, sans modifier les données de Ma Santé.
- Une telle prise apparaît « Omis », jamais quantité 0.
- Pas pris / Pas nécessaire / Reporté portent *.
- * Cette prise a été volontairement modifiée par l'utilisateur. Veuillez en parler avec lui.
- Les prises au besoin utilisent † pour garder une signification unique à *.
