// @flow

import * as React from 'react';

import electron from '../electron.js';

function PushNotificationsHandler(): React.Node {
  React.useEffect(() => {
    (async () => {
      if (!navigator.serviceWorker || electron) {
        return;
      }

      await navigator.serviceWorker.register('/worker/notif', { scope: '/' });
    })();
  }, []);

  return null;
}

export { PushNotificationsHandler };
