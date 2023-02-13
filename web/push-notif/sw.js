// @flow

self.addEventListener('install', () => {
  console.log('service worker installed');
});

self.addEventListener('activate', () => {
  console.log('service worker activated');
});
