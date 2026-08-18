Ma Santé v0.2.5.5 — Android Bridge

Correction : la synchronisation vers MaSanteBridge est maintenant déclenchée directement pendant le clic Enregistrer (sans setTimeout, afin de conserver le geste utilisateur requis par Android/Chrome pour ouvrir une application externe).
Le lancement utilise aussi un intent:// explicite vers le package ch.masante.bridge.
