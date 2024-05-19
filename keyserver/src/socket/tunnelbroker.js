// @flow

import { clientTunnelbrokerSocketReconnectDelay } from 'lib/shared/timeouts.js';
import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import sleep from 'lib/utils/sleep.js';

import TunnelbrokerSocket from './tunnelbroker-socket.js';
import { type IdentityInfo } from '../user/identity.js';
import { getContentSigningKey } from '../utils/olm-utils.js';

type TBConnectionInfo = {
  +url: string,
};

async function getTBConnectionInfo(): Promise<TBConnectionInfo> {
  const tbConfig = await getCommConfig<TBConnectionInfo>({
    folder: 'facts',
    name: 'tunnelbroker',
  });

  if (tbConfig) {
    return tbConfig;
  }

  //console.warn('Defaulting to local Tunnelbroker');
  //return { url: 'ws://192.168.50.75:51001' };
  console.warn('Defaulting to staging Tunnelbroker');
  return {
    url: 'wss://tunnelbroker.staging.commtechnologies.org:51001',
  };
}

async function createAndMaintainTunnelbrokerWebsocket(
  identityInfo: IdentityInfo,
) {
  const [deviceID, tbConnectionInfo] = await Promise.all([
    getContentSigningKey(),
    getTBConnectionInfo(),
  ]);

  const initMessage: ConnectionInitializationMessage = {
    type: 'ConnectionInitializationMessage',
    deviceID: deviceID,
    accessToken: identityInfo.accessToken,
    userID: identityInfo.userId,
    deviceType: 'keyserver',
  };

  const createNewTunnelbrokerSocket = () => {
    new TunnelbrokerSocket(tbConnectionInfo.url, initMessage, async () => {
      await sleep(clientTunnelbrokerSocketReconnectDelay);
      createNewTunnelbrokerSocket();
    });
  };
  createNewTunnelbrokerSocket();
}

export { createAndMaintainTunnelbrokerWebsocket };
