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
  const notif = new Notification({
    title,
    body,
  });
  notif.on('click', () => handleClick(threadID));
  notif.show();
}

function listenForNotifications(handleClick: (threadID: string) => void) {
  if (process.platform !== 'darwin') {
    return;
  }
  pushNotifications.on('received-apns-notification', (event, userInfo) => {
    showNewNotification(userInfo, handleClick);
  });
}

export { listenForNotifications, registerForNotifications };
