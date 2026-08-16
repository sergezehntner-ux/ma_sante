Ma Santé v0.2.5.2 — pont Android horaires

Cette version utilise volontairement un nouveau fichier JavaScript :
    app-0252.js
au lieu de app.js.

But :
- éviter qu'un ancien app.js reste servi par GitHub Pages / cache ;
- regrouper les traitements et mesures par horaire exact HH:MM ;
- envoyer les horaires restants d'aujourd'hui à MaSanteBridge ;
- conserver la notification immédiate comme test.

Déploiement GitHub :
1. Extraire cette archive.
2. Envoyer TOUS les fichiers du dossier sur la branche main du dépôt ma_sante.
3. Le fichier index.html doit référencer app-0252.js?v=02502.
4. Le service worker utilise le cache ma-sante-cache-v02502.

Important :
MaSanteBridge Android doit être la version déjà recompilée qui accepte le paramètre times.
