const cacheName='gcf'; //PWA id here
const appFiles=[
  'manifest.json',  
  'index.html',
  'style.css',
  'gcf.js',
  'sw.js',
  'app.js',
  'chartDataGenWorker.js',
  'stocks.json',
  'lib/chart.js',
  'lib/chartjs-adapter-date-fns.bundle.min.js',
  'fonts/Xolonium-Bold.woff2',
  'fonts/Xolonium-Regular.woff2',
  'fonts/Nunito.ttf',
  'pics/favicon.png',
  'pics/pwaicon.png',
  'pics/lowspec/krarlik_front.webp',
  'pics/lowspec/krarlik_eye.webp',
  'pics/lowspec/krarlik2.webp',
  'pics/lowspec/intro.webp',
  'pics/lowspec/logo.webp',
  'pics/midspec/krarlik_front.webp',
  'pics/midspec/krarlik_eye.webp',
  'pics/midspec/krarlik2.webp',
  'pics/midspec/intro.webp',
  'pics/midspec/logo.webp'
  'pics/ultraspec/krarlik_front.webp',
  'pics/ultraspec/krarlik_eye.webp',
  'pics/ultraspec/krarlik2.webp',
  'pics/ultraspec/intro.webp',
  'pics/ultraspec/logo.webp'
  'pics/lpg.png',
  'pics/stonks.webp',
  'sound/transaction.opus',
  //add all PWA files here
];

// Caches all the PWA shell files (appFiles array) when the app is launched
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  const filesUpdate = cache => {
      const stack = [];
      appFiles.forEach(file => stack.push(
          cache.add(file).catch(_=>console.error(`can't load ${file} to cache`))
      ));
      return Promise.all(stack);
  };
  e.waitUntil(caches.open(cacheName).then(filesUpdate));
});

// Called when the app fetches a resource like an image, caches it automatically
self.addEventListener('fetch', (e) => {
  e.respondWith(
    (async () => {
      const r = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      if(e.request.url.indexOf("/version.txt?t=")==-1){ //don't cache attempts to fetch new version
        const cache = await caches.open(cacheName);
        console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
        cache.put(e.request, response.clone());
      }
      return response;
    })()
  );
});

// Called when the service worker is started
self.addEventListener('activate', (e) => {
    console.log("[Service Worker] Activated");
});
