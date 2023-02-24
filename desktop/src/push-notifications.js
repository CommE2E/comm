// @flow

// eslint-disable-next-line import/extensions
import { pushNotifications, Notification } from 'electron/main';

async function registerForNotifications(): Promise<?string> {
  if (process.platform !== 'darwin') {
    return null;
  }

  try {
    const token = await pushNotifications.registerForAPNSNotifications();
    return token;
  } catch (err) {
    console.error(err);
  }

  return null;
}

function listenForNotifications(handleClick: (threadID: string) => void) {
  if (process.platform !== 'darwin') {
    return;
  }
  pushNotifications.on('received-apns-notification', (event, userInfo) => {
    if (
      typeof userInfo.title !== 'string' ||
      typeof userInfo.body !== 'string' ||
      typeof userInfo.threadID !== 'string'
    ) {
      console.error(
        'Notification must contain a string title, body and threadID',
      );
      return;
    }
    const { title, body, threadID } = userInfo;

    const notif = new Notification({
      title,
      body,
    });
    notif.on('click', () => {
      handleClick(threadID);
    });
    notif.show();
  });
}

export { listenForNotifications, registerForNotifications };
