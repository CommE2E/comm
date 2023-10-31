// @flow

import localforage from 'localforage';

import type {
  PlainTextWebNotification,
  WebNotification,
} from 'lib/types/notif-types.js';
import { convertNonPendingIDToNewSchema } from 'lib/utils/migration-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  decryptWebNotification,
  OLM_WASM_PATH_KEY,
} from './notif-crypto-utils.js';
import { localforageConfig } from '../database/utils/constants.js';

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
  localforage.config(localforageConfig);
  event.waitUntil(
    (async () => {
      if (!event.data.olmFilePath) {
        return;
      }
      await localforage.setItem(OLM_WASM_PATH_KEY, event.data.olmFilePath);
    })(),
  );
});

self.addEventListener('push', (event: PushEvent) => {
  localforage.config(localforageConfig);
  const data: WebNotification = event.data.json();

  event.waitUntil(
    (async () => {
      let plainTextData: PlainTextWebNotification;

      if (data.encryptedPayload) {
        try {
          plainTextData = await decryptWebNotification(data);
        } catch (e) {
          console.log(`Failed to decrypt notification with id: ${data.id}`, e);
          return;
        }
      } else if (data.body) {
        plainTextData = data;
      } else {
        // We will never enter ths branch. It is
        // necessary since flow doesn't differentiate
        // between union types out-of-the-box.
        return;
      }

      let body = plainTextData.body;
      if (data.prefix) {
        body = `${data.prefix} ${body}`;
      }
      await self.registration.showNotification(data.title, {
        body,
        badge: 'https://web.comm.app/favicon.ico',
        icon: 'https://web.comm.app/favicon.ico',
        tag: plainTextData.id,
        data: {
          unreadCount: plainTextData.unreadCount,
          threadID: plainTextData.threadID,
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
            : 'http://localhost:3000/webapp') + `/chat/thread/${threadID}/`;
        clients.openWindow(url);
      }
    })(),
  );
});
