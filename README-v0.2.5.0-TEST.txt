Ma Santé v0.2.5.0 — TEST EXPÉRIMENTAL DES NOTIFICATIONS

Base : v0.2.4.20 validée.
Aucune logique de traitement, mesure ou rappel quotidien n'est modifiée.

Dans Plus > Notifications — test expérimental :
1. Autoriser les notifications.
2. Tester maintenant.
3. Tester dans 2 minutes.
4. Pour le test différé, fermer Ma Santé et verrouiller le smartphone.

IMPORTANT
Le test différé n'utilise PAS de faux setTimeout de secours.
Il ne se programme que si le navigateur expose réellement Notification Triggers
(showTrigger + TimestampTrigger). Sinon Ma Santé l'indique explicitement.
