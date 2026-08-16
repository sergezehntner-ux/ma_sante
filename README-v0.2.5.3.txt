Ma Santé v0.2.5.3 — pont Android horaires

Cette version complète utilise app-0253.js (et non app.js).

Test attendu dans Plus :
le bouton doit afficher :
    Programmer les horaires d’aujourd’hui

Fonction :
- récupère les horaires de traitements applicables aujourd'hui ;
- récupère les horaires de mesures applicables aujourd'hui ;
- fusionne les doublons : un seul réveil par HH:MM ;
- ignore les horaires déjà passés ;
- envoie le paquet à MaSanteBridge via masante://alarm?times=...

MaSanteBridge doit être la version déjà installée qui accepte le paramètre "times".
