// @flow

import type {
  PushNotificationManager as PushNotificationManagerType,
  PushNotificationReceivedEventArgs,
} from '@commapp/windowspush';
// eslint-disable-next-line import/extensions
import { app, pushNotifications, Notification } from 'electron/main';
import EventEmitter from 'events';
import { resolve } from 'path';

import { isNormalStartup } from './handle-squirrel-event.js';

let windowsPushNotificationManager;
const windowsPushNotifEventEmitter = new EventEmitter();
if (process.platform === 'win32' && app.isPackaged && isNormalStartup()) {
  void (async () => {
    try {
      const { PushNotificationManager } = await import('@commapp/windowspush');

      if (!PushNotificationManager.isSupported()) {
        return;
      }

      windowsPushNotificationManager = PushNotificationManager.default;

      const handleEvent = (
        manager: PushNotificationManagerType,
        event: PushNotificationReceivedEventArgs,
      ) => {
        const byteArray = [];
        for (let i = 0; i < event.payload.length; i++) {
          byteArray.push(event.payload[i]);
        }
        const payload = Buffer.from(byteArray).toString('utf-8');
        windowsPushNotifEventEmitter.emit(
          'received-wns-notification',
          JSON.parse(payload),
        );
      };

      // Windows requires that this must be called before the call to `register`
      windowsPushNotificationManager.addListener('PushReceived', handleEvent);

      windowsPushNotificationManager.register();

      app.on('quit', () => {
        windowsPushNotificationManager.removeListener(
          'PushReceived',
          handleEvent,
        );
        windowsPushNotificationManager.unregisterAll();
      });
    } catch (err) {
      console.error(
        `Error while loading windows push notifications ${err.message}`,
      );
    }
  })();
}

async function registerForNotifications(): Promise<?string> {
  if (process.platform === 'darwin') {
    try {
      const token = await pushNotifications.registerForAPNSNotifications();
      return token;
    } catch (err) {
      console.error(err);
    }
  } else if (process.platform === 'win32' && windowsPushNotificationManager) {
    try {
      const token = await new Promise<string>((resolvePromise, reject) => {
        windowsPushNotificationManager.createChannelAsync(
          'f09f4211-a998-40c1-a515-689e3faecb62',
          (error, result) => {
            if (error) {
              reject(error);
            }
            resolvePromise(result.channel.uri);
          },
        );
      });

      return token;
    } catch (err) {
      console.error(err);
    }
  }

  return null;
}

function showNewNotification(
  payload: { +[string]: mixed },
  handleClick: (threadID?: string) => void,
) {
  const windowsIconPath = resolve(__dirname, '../icons/icon.ico');
  if (
    typeof payload.error === 'string' &&
    typeof payload.displayErrorMessage === 'boolean'
  ) {
    const notif = new Notification({
      title: 'Comm notification',
      body: payload.displayErrorMessage ? payload.error : undefined,
      icon: process.platform === 'win32' ? windowsIconPath : undefined,
    });

    notif.on('click', () => handleClick());
    notif.show();
    return;
  }

  if (
    typeof payload.title !== 'string' ||
    typeof payload.body !== 'string' ||
    typeof payload.threadID !== 'string'
  ) {
    return;
  }
  const { title, body, threadID } = payload;
  const notif = new Notification({
    title,
    body,
    icon: process.platform === 'win32' ? windowsIconPath : undefined,
  });
  notif.on('click', () => handleClick(threadID));
  notif.show();
}

function listenForNotifications(
  handleClick: (threadID?: string) => void,
  handleEncryptedNotification: (
    encryptedPayload: string,
    keyserverID: string,
    type: string,
  ) => void,
) {
  if (process.platform === 'darwin') {
    pushNotifications.on('received-apns-notification', (event, userInfo) => {
      const { keyserverID, encryptedPayload, type } = userInfo;
      if (
        typeof keyserverID === 'string' &&
        typeof encryptedPayload === 'string' &&
        typeof type === 'string'
      ) {
        handleEncryptedNotification(encryptedPayload, keyserverID, type);
        return;
      }
      showNewNotification(userInfo, handleClick);
    });
  } else if (process.platform === 'win32') {
    windowsPushNotifEventEmitter.on('received-wns-notification', payload => {
      const { keyserverID, encryptedPayload, type } = payload;
      if (
        typeof keyserverID === 'string' &&
        typeof encryptedPayload === 'string' &&
        typeof type === 'string'
      ) {
        handleEncryptedNotification(encryptedPayload, keyserverID, type);
        return;
      }
      showNewNotification(payload, handleClick);
    });
  }
}
export {
  listenForNotifications,
  registerForNotifications,
  showNewNotification,
};
