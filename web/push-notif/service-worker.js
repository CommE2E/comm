// @flow

import localforage from 'localforage';

import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import type {
  PlainTextWebNotification,
  WebNotification,
} from 'lib/types/notif-types.js';

import {
  decryptWebNotification,
  migrateLegacyOlmNotificationsSessions,
  WEB_NOTIFS_SERVICE_UTILS_KEY,
  type WebNotifsServiceUtilsData,
  type WebNotifDecryptionError,
} from './notif-crypto-utils.js';
import { persistAuthMetadata } from './services-client.js';
import { localforageConfig } from '../shared-worker/utils/constants.js';

declare class PushMessageData {
  json(): Object;
}
declare class PushEvent extends ExtendableEvent {
  +data: PushMessageData;
}

declare class CommAppMessage extends ExtendableEvent {
  +data: {
    +olmWasmPath?: string,
    +staffCanSee?: boolean,
    +authMetadata?: AuthMetadata,
  };
}

declare var clients: Clients;
declare function skipWaiting(): Promise<void>;

const commIconUrl = 'https://web.comm.app/favicon.ico';

function buildDecryptionErrorNotification(
  decryptionError: WebNotifDecryptionError,
) {
  const baseErrorPayload = {
    badge: commIconUrl,
    icon: commIconUrl,
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

self.addEventListener('install', skipWaiting);

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event: CommAppMessage) => {
  localforage.config(localforageConfig);
  event.waitUntil(
    (async () => {
      const { olmWasmPath, staffCanSee, authMetadata } = event.data;

      if (!olmWasmPath || staffCanSee === undefined || !authMetadata) {
        return;
      }

      const webNotifsServiceUtils: WebNotifsServiceUtilsData = {
        olmWasmPath: olmWasmPath,
        staffCanSee: staffCanSee,
      };

      await Promise.all([
        localforage.setItem(
          WEB_NOTIFS_SERVICE_UTILS_KEY,
          webNotifsServiceUtils,
        ),
        persistAuthMetadata(authMetadata),
      ]);

      await migrateLegacyOlmNotificationsSessions();
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
      await self.registration.showNotification(plainTextData.title, {
        body,
        badge: commIconUrl,
        icon: commIconUrl,
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
        threadID = event.notification.data.threadID;
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
        await clients.openWindow(url);
      }
    })(),
  );
});
