// @flow

// eslint-disable-next-line import/extensions
import { app, pushNotifications, Notification } from 'electron/main';
import EventEmitter from 'events';
import { resolve } from 'path';

import { isNormalStartup } from './handle-squirrel-event.js';

let windowsPushNotificationManager;
const windowsPushNotifEventEmitter = new EventEmitter();
if (process.platform === 'win32' && app.isPackaged && isNormalStartup()) {
  (async () => {
    try {
      const { PushNotificationManager } = await import('@commapp/windowspush');

      if (!PushNotificationManager.isSupported()) {
        return;
      }

      windowsPushNotificationManager = PushNotificationManager.default;

      const handleEvent = (manager, event) => {
        const payload = Buffer.from(event.payload, 'utf-8').toString();
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
      const token = await new Promise((resolvePromise, reject) => {
        windowsPushNotificationManager.createChannelAsync(
          'XXX',
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
  handleClick: (threadID: string) => void,
) {
  if (
    typeof payload.title !== 'string' ||
    typeof payload.body !== 'string' ||
    typeof payload.threadID !== 'string'
  ) {
    return;
  }
  const { title, body, threadID } = payload;
  const windowsIconPath = resolve(__dirname, '../icons/icon.ico');
  const notif = new Notification({
    title,
    body,
    icon: process.platform === 'win32' ? windowsIconPath : undefined,
  });
  notif.on('click', () => handleClick(threadID));
  notif.show();
}

function listenForNotifications(handleClick: (threadID: string) => void) {
  if (process.platform === 'darwin') {
    pushNotifications.on('received-apns-notification', (event, userInfo) => {
      showNewNotification(userInfo, handleClick);
    });
  } else if (process.platform === 'win32') {
    windowsPushNotifEventEmitter.on('received-wns-notification', payload => {
      showNewNotification(payload, handleClick);
    });
  }
}
export { listenForNotifications, registerForNotifications };
