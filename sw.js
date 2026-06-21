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

const CACHE_NAME = 'gradido-calc-v19';

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
// 'reload' erzwingt frische Dateien aus dem Netz statt aus dem HTTP-Cache des
// Browsers — sonst koennte eine veraltete Version vorab-gecacht werden.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
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

// Abrufen: STALE-WHILE-REVALIDATE — sofort aus dem Cache antworten (schnell;
// offline OHNE Netz-Zugriff -> keine "kein Internet"-Nachfrage), und nur WENN
// online im Hintergrund frisch nachladen, um den Cache fuer den naechsten Start
// zu aktualisieren. So bleibt die App voll offline-tauglich UND aktualisiert sich
// selbst (neue Inhalte sind beim naechsten Start da), ohne Neu-Installation.
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }
    event.respondWith(
        caches.match(request).then((cached) => {
            // Hintergrund-Aktualisierung NUR wenn online; offline nie ans Netz greifen.
            const fresh = (self.navigator && self.navigator.onLine)
                ? fetch(request).then((response) => {
                    if (response && response.ok && response.type === 'basic') {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
                    }
                    return response;
                }).catch(() => null)
                : Promise.resolve(null);

            if (cached) {
                event.waitUntil(fresh);   // Hintergrund-Update am Leben halten, aber sofort den Cache liefern
                return cached;
            }
            return fresh.then((r) => r || (request.mode === 'navigate' ? caches.match('./index.html') : undefined));
        })
    );
});

// Auf Anfrage der Seite die eigene Cache-Version melden (fuer die Versionsanzeige in den Einstellungen).
self.addEventListener('message', (event) => {
    if (event.data === 'version' && event.ports && event.ports[0]) {
        event.ports[0].postMessage({ swVersion: CACHE_NAME });
    }
});
