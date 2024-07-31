// @flow

import * as React from 'react';

import { setTBDeviceTokenActionTypes } from '../actions/tunnelbroker-actions.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import {
  messageToTunnelbrokerTypes,
  type SetDeviceTokenWithPlatform,
} from '../types/tunnelbroker/message-to-tunnelbroker-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function TunnelbrokerDeviceTokenHandler(): React.Node {
  const dispatchActionPromise = useDispatchActionPromise();

  const tunnelbrokerDeviceToken = useSelector(
    state => state.tunnelbrokerDeviceToken,
  );
  const { socketState, sendMessageToTunnelbroker } = useTunnelbroker();

  React.useEffect(() => {
    const { platform } = getConfig().platformDetails;

    if (
      !socketState.isAuthorized ||
      !tunnelbrokerDeviceToken.localToken ||
      tunnelbrokerDeviceToken.localToken ===
        tunnelbrokerDeviceToken.tunnelbrokerToken
    ) {
      return;
    }

    const message: SetDeviceTokenWithPlatform = {
      type: messageToTunnelbrokerTypes.SET_DEVICE_TOKEN_WITH_PLATFORM,
      deviceToken: tunnelbrokerDeviceToken.localToken,
      platform,
    };
    const deviceToken = tunnelbrokerDeviceToken.localToken;
    const promise: Promise<{ deviceToken: string }> = (async () => {
      await sendMessageToTunnelbroker(JSON.stringify(message));
      return { deviceToken };
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
