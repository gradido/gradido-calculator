/*
 * Service Worker für den Gradido-Calculator.
 * Macht die App vollständig offline-fähig: legt beim ersten (Online-)Besuch
 * alle nötigen Dateien in einen lokalen Cache und bedient spätere Aufrufe
 * daraus — auch ohne Internetverbindung.
 *
 * WICHTIG bei Änderungen an der App:
 * Die Versionsnummer in CACHE_NAME erhöhen (v1 -> v2 -> ...), damit Nutzer
 * beim nächsten Online-Besuch die neuen Dateien bekommen statt der alten
 * aus dem Cache. Alte Caches werden beim 'activate' automatisch gelöscht.
 */

const CACHE_NAME = 'gradido-calc-v8';

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.webmanifest',
    './montserrat-latin-400.woff2',
    './gradido-coin.png',
    './icon-192x192.png',
    './icon-256x256.png',
    './icon-384x384.png',
    './icon-512x512.png'
];

// Installieren: alle App-Dateien in den Cache laden.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Aktivieren: veraltete Cache-Versionen entfernen.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Abrufen: zuerst aus dem Cache, sonst aus dem Netz; bei Seitenaufrufen
// offline auf die zwischengespeicherte index.html zurückfallen.
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }
    event.respondWith(
        caches.match(request).then((cached) => {
            return cached || fetch(request).catch(() => {
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
