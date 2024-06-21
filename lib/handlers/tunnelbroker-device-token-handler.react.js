// @flow

import * as React from 'react';

import { setTBDeviceTokenActionTypes } from '../actions/tunnelbroker-actions.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import {
  messageToTunnelbrokerTypes,
  type SetDeviceToken,
} from '../types/tunnelbroker/message-to-tunnelbroker-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function TunnelbrokerDeviceTokenHandler(): React.Node {
  const dispatchActionPromise = useDispatchActionPromise();

  const tunnelbrokerDeviceToken = useSelector(
    state => state.tunnelbrokerDeviceToken,
  );
  const { socketState, sendMessageToTunnelbroker } = useTunnelbroker();

  React.useEffect(() => {
    if (
      !socketState.isAuthorized ||
      !tunnelbrokerDeviceToken.localToken ||
      tunnelbrokerDeviceToken.localToken ===
        tunnelbrokerDeviceToken.tunnelbrokerToken
    ) {
      return;
    }

    const message: SetDeviceToken = {
      type: messageToTunnelbrokerTypes.SET_DEVICE_TOKEN,
      deviceToken: tunnelbrokerDeviceToken.localToken,
    };
    const promise = (async () => {
      await sendMessageToTunnelbroker(JSON.stringify(message));
      return { deviceToken: tunnelbrokerDeviceToken.localToken };
    })();
    void dispatchActionPromise(setTBDeviceTokenActionTypes, promise);
  }, [
    dispatchActionPromise,
    sendMessageToTunnelbroker,
    socketState,
    socketState.isAuthorized,
    tunnelbrokerDeviceToken,
  ]);

  return null;
}

export { TunnelbrokerDeviceTokenHandler };
