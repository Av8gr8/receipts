// Offline-first: the app always opens instantly from its saved copy (works in flight, with no
// signal, or behind an unpaid in-flight Wi-Fi login page). When there is a connection, a fresh
// copy is fetched in the background and used the next time the app is opened.
const C='jetreceipts-v19';
const SHELL='./index.html';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];

self.addEventListener('install',e=>{
  // Cache each file on its own, so one missing file can't stop the app being saved for offline use.
  e.waitUntil(caches.open(C).then(c=>Promise.allSettled(ASSETS.map(u=>
    fetch(new Request(u,{cache:'reload'})).then(r=>{if(r.ok&&!r.redirected)return c.put(u,r);})))));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  const u=new URL(req.url);
  if(req.method!=='GET'||u.origin!==location.origin||u.searchParams.has('check'))return; // ?check = app's own update check, straight to network
  const nav=req.mode==='navigate', key=nav?SHELL:req;
  e.respondWith(caches.match(key,{ignoreSearch:true}).then(cached=>{
    const net=fetch(req,{cache:'no-cache'}).then(r=>{
      // Only keep genuine pages from our own site (not a captive-portal or error page).
      if(r.ok&&!r.redirected&&r.type==='basic'){const cp=r.clone();caches.open(C).then(c=>c.put(key,cp));}
      return r;
    }).catch(()=>null);
    if(cached){e.waitUntil(net);return cached;}
    return net.then(r=>r||caches.match(SHELL)).then(r=>r||new Response('Offline',{status:503}));
  }));
});
