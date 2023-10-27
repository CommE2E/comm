// @flow

import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';
import { getCommConfig } from 'lib/utils/comm-config.js';

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

  console.warn('Defaulting to local Tunnelbroker instance');
  return {
    url: 'ws://127.0.0.1:51001',
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

  new TunnelbrokerSocket(tbConnectionInfo.url, initMessage);
}

export { createAndMaintainTunnelbrokerWebsocket };
