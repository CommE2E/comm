// @flow

import { clientTunnelbrokerSocketReconnectDelay } from 'lib/shared/timeouts.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import sleep from 'lib/utils/sleep.js';

import TunnelbrokerSocket from './tunnelbroker-socket.js';
import { fetchIdentityInfo } from '../user/identity.js';
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

async function createAndMaintainTunnelbrokerWebsocket(encryptionKey: ?string) {
  const [deviceID, tbConnectionInfo] = await Promise.all([
    getContentSigningKey(),
    getTBConnectionInfo(),
  ]);
  const createNewTunnelbrokerSocket = async (
    justSuccessfullyAuthenticated: boolean,
    primaryDeviceID: ?string,
  ) => {
    const identityInfo = await fetchIdentityInfo();
    new TunnelbrokerSocket(
      tbConnectionInfo.url,
      async (successfullyAuthed: boolean, primaryID: ?string) => {
        await sleep(clientTunnelbrokerSocketReconnectDelay);
        await createNewTunnelbrokerSocket(successfullyAuthed, primaryID);
      },
      identityInfo?.userId,
      deviceID,
      identityInfo?.accessToken,
      encryptionKey,
      primaryDeviceID,
      justSuccessfullyAuthenticated,
    );
  };
  await createNewTunnelbrokerSocket(false, null);
}

export { createAndMaintainTunnelbrokerWebsocket };
