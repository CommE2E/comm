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
  WEB_NOTIFS_SERVICE_UTILS_KEY,
  type WebNotifsServiceUtilsData,
  type WebNotifDecryptionError,
} from './notif-crypto-utils.js';
import { localforageConfig } from '../database/utils/constants.js';

declare class PushMessageData {
  json(): Object;
}
declare class PushEvent extends ExtendableEvent {
  +data: PushMessageData;
}

declare class CommAppMessage extends ExtendableEvent {
  +data: { +olmWasmPath?: string, +staffCanSee?: boolean };
}

declare var clients: Clients;
declare function skipWaiting(): Promise<void>;

function buildDecryptionErrorNotification(
  decryptionError: WebNotifDecryptionError,
) {
  const baseErrorPayload = {
    badge: 'https://web.comm.app/favicon.ico',
    icon: 'https://web.comm.app/favicon.ico',
    tag: decryptionError.id,
    data: {
      isError: true,
    },
  };

  if (decryptionError.displayErrorMessage && decryptionError.error) {
    return {
      body: decryptionError.error,
      ...baseErrorPayload,
    };
  }

  return baseErrorPayload;
}

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
      if (!event.data.olmWasmPath || event.data.staffCanSee === undefined) {
        return;
      }

      const webNotifsServiceUtils: WebNotifsServiceUtilsData = {
        olmWasmPath: event.data.olmWasmPath,
        staffCanSee: event.data.staffCanSee,
      };

      await localforage.setItem(
        WEB_NOTIFS_SERVICE_UTILS_KEY,
        webNotifsServiceUtils,
      );
    })(),
  );
});

self.addEventListener('push', (event: PushEvent) => {
  localforage.config(localforageConfig);
  const data: WebNotification = event.data.json();

  event.waitUntil(
    (async () => {
      let plainTextData: PlainTextWebNotification;
      let decryptionResult: PlainTextWebNotification | WebNotifDecryptionError;

      if (data.encryptedPayload) {
        decryptionResult = await decryptWebNotification(data);
      }

      if (decryptionResult && decryptionResult.error) {
        const decryptionErrorNotification =
          buildDecryptionErrorNotification(decryptionResult);
        await self.registration.showNotification(
          'Comm notification',
          decryptionErrorNotification,
        );
        return;
      } else if (decryptionResult && decryptionResult.body) {
        plainTextData = decryptionResult;
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

      // Decryption error notifications don't contain threadID
      // but we still want them to be interactive in terms of basic
      // navigation.
      let threadID;
      if (!event.notification.data.isError) {
        threadID = convertNonPendingIDToNewSchema(
          event.notification.data.threadID,
          ashoatKeyserverID,
        );
      }

      if (selectedClient) {
        if (!selectedClient.focused) {
          await selectedClient.focus();
        }
        if (threadID) {
          selectedClient.postMessage({
            targetThreadID: threadID,
          });
        }
      } else {
        const baseURL =
          process.env.NODE_ENV === 'production'
            ? 'https://web.comm.app'
            : 'http://localhost:3000/webapp';
        const url = threadID ? baseURL + `/chat/thread/${threadID}/` : baseURL;
        clients.openWindow(url);
      }
    })(),
  );
});
