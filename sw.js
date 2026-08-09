const CACHE='ma-sante-v016';
const CORE=['./index.html','./styles.css','./app.js','./manifest.webmanifest'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ma-sante-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return resp}).catch(()=>caches.match('./index.html')));return}event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)))});
