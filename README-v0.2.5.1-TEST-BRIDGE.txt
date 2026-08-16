Ma Santé v0.2.5.1 — TEST PONT ANDROID MaSanteBridge

Modification ciblée par rapport à v0.2.5.0 :
- le bouton « Tester dans 2 minutes » ouvre maintenant un lien masante://alarm avec l’heure courante + 2 minutes ;
- MaSanteBridge peut intercepter ce lien et transmettre la demande à l’application Horloge Android ;
- le test de notification immédiate reste inchangé ;
- cache PWA incrémenté à ma-sante-cache-v02501.

Aucune automatisation générale des prises n’est encore activée dans cette version : il s’agit uniquement du test de bout en bout Ma Santé → MaSanteBridge → Horloge.
