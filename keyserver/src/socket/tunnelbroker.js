// @flow

import { clientTunnelbrokerSocketReconnectDelay } from 'lib/shared/timeouts.js';
import type {
  ConnectionInitializationMessage,
  AnonymousInitializationMessage,
} from 'lib/types/tunnelbroker/session-types.js';
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

  createAndMaintainTunnelbrokerWebsocketBase(tbConnectionInfo.url, initMessage);
}

async function createAndMaintainAnonymousTunnelbrokerWebsocket(
  encryptionKey: string,
) {
  const [deviceID, tbConnectionInfo] = await Promise.all([
    getContentSigningKey(),
    getTBConnectionInfo(),
  ]);

  const initMessage: AnonymousInitializationMessage = {
    type: 'AnonymousInitializationMessage',
    deviceID: deviceID,
    deviceType: 'keyserver',
  };

  createAndMaintainTunnelbrokerWebsocketBase(
    tbConnectionInfo.url,
    initMessage,
    encryptionKey,
  );
}

function createAndMaintainTunnelbrokerWebsocketBase(
  url: string,
  initMessage: ConnectionInitializationMessage | AnonymousInitializationMessage,
  encryptionKey?: string,
) {
  const createNewTunnelbrokerSocket = () => {
    new TunnelbrokerSocket(
      url,
      initMessage,
      async () => {
        await sleep(clientTunnelbrokerSocketReconnectDelay);
        createNewTunnelbrokerSocket();
      },
      encryptionKey,
    );
  };
  createNewTunnelbrokerSocket();
}

export {
  createAndMaintainTunnelbrokerWebsocket,
  createAndMaintainAnonymousTunnelbrokerWebsocket,
};
