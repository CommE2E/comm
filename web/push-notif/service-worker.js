// @flow

import type { WebNotification } from 'lib/types/notif-types.js';

declare class PushMessageData {
  json(): Object;
}
declare class PushEvent extends ExtendableEvent {
  +data: PushMessageData;
}

declare var clients: Clients;
declare function skipWaiting(): Promise<void>;

self.addEventListener('install', () => {
  skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event: PushEvent) => {
  const data: WebNotification = event.data.json();

  event.waitUntil(
    (async () => {
      let body = data.body;
      if (data.prefix) {
        body = `${data.prefix} ${body}`;
      }
      await self.registration.showNotification(data.title, {
        body,
        badge: 'https://web.comm.app/favicon.ico',
        icon: 'https://web.comm.app/favicon.ico',
        tag: data.id,
        data: {
          unreadCount: data.unreadCount,
          threadID: data.threadID,
        },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList: Array<WindowClient> = (await clients.matchAll({
        type: 'window',
      }): any);

      const selectedClient =
        clientList.find(client => client.focused) ?? clientList[0];

      if (selectedClient) {
        if (!selectedClient.focused) {
          await selectedClient.focus();
        }
        selectedClient.postMessage({
          targetThreadID: event.notification.data.threadID,
        });
      } else {
        const url =
          (process.env.NODE_ENV === 'production'
            ? 'https://web.comm.app'
            : 'http://localhost:3000/comm') +
          `/chat/thread/${event.notification.data.threadID}/`;
        clients.openWindow(url);
      }
    })(),
  );
});
