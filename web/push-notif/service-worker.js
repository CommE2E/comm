// @flow

import olm from '@commapp/olm';

import type { PlainTextWebNotification } from 'lib/types/notif-types.js';
import { convertNonPendingIDToNewSchema } from 'lib/utils/migration-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

declare class PushMessageData {
  json(): Object;
}
declare class PushEvent extends ExtendableEvent {
  +data: PushMessageData;
}

declare class CommAppMessage extends ExtendableEvent {
  +data: { +olmFilePath?: string };
}

declare var clients: Clients;
declare function skipWaiting(): Promise<void>;

self.addEventListener('install', () => {
  skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event: CommAppMessage) => {
  event.waitUntil(
    (async () => {
      if (!event.data.olmFilePath) {
        return;
      }
      try {
        await olm.init({
          locateFile: () => event.data.olmFilePath,
        });
      } catch (e) {
        console.log('Failed to initialize olm', e);
      }
    })(),
  );
});

self.addEventListener('push', (event: PushEvent) => {
  const data: PlainTextWebNotification = event.data.json();

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

      const threadID = convertNonPendingIDToNewSchema(
        event.notification.data.threadID,
        ashoatKeyserverID,
      );

      if (selectedClient) {
        if (!selectedClient.focused) {
          await selectedClient.focus();
        }
        selectedClient.postMessage({
          targetThreadID: threadID,
        });
      } else {
        const url =
          (process.env.NODE_ENV === 'production'
            ? 'https://web.comm.app'
            : 'http://localhost:3000/comm') + `/chat/thread/${threadID}/`;
        clients.openWindow(url);
      }
    })(),
  );
});
