const CACHE='ma-sante-cache-v02509';
const CORE=['./index.html','./styles.css','./app-0259.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ma-sante-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 const coreDynamic=u.pathname.endsWith('/index.html')||(u.pathname.endsWith('/app.js')||/\/app-[^/]+\.js$/.test(u.pathname))||u.pathname.endsWith('/styles.css')||u.pathname.endsWith('/');
 if(coreDynamic){
   e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
   return;
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
   for(const c of list){if('focus'in c)return c.focus()}
   if(clients.openWindow)return clients.openWindow('./');
 }));
});
