/* Revision Room service worker: offline shell + share target */
var VERSION = 'rr-v21';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'pdf.min.js', 'pdf.worker.min.js', 'config.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
var KEEP = [VERSION, 'rr-shared', 'rr-fonts'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(new Request(u, {cache: 'reload'})).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return KEEP.indexOf(k) < 0; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
function swr(req, cacheName){
  return caches.open(cacheName).then(function(c){
    return c.match(req, {ignoreSearch: true}).then(function(hit){
      var net = fetch(req).then(function(res){ if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function(){ return hit; });
      return hit || net;
    });
  });
}
function receiveShared(e){
  return e.request.formData().then(function(fd){
    var files = fd.getAll('lessons');
    return caches.open('rr-shared').then(function(c){
      return Promise.all(files.map(function(f, i){ return c.put('shared/' + i + '/' + encodeURIComponent(f.name), new Response(f, {headers: {'Content-Type': f.type || 'application/octet-stream'}})); }));
    });
  }).then(function(){ return Response.redirect('./?shared=1', 303); });
}
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.slice(-13) === '/share-target') { e.respondWith(receiveShared(e)); return; }
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(swr(new Request('index.html'), VERSION)); return; }
  if (url.origin === location.origin) { e.respondWith(swr(req, VERSION)); return; }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(swr(req, 'rr-fonts'));
});
