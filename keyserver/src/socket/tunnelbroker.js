// @flow

import invariant from 'invariant';
import WebSocket from 'ws';

import {
  type TBKeyserverConnectionInitializationMessage,
  type TBMessage,
} from 'lib/types/tunnelbroker-messages.js';
import { TBRefreshKeysValidator } from 'lib/types/tunnelbroker-messages.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { ServerError } from 'lib/utils/errors.js';
import sleep from 'lib/utils/sleep.js';

import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import { type IdentityInfo } from '../user/identity.js';
import { uploadNewOneTimeKeys } from '../utils/olm-utils.js';

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

  console.warn('Defaulting to local tunnelbroker instance');
  return {
    url: 'ws://127.0.0.1:51001',
  };
}

async function createAndMaintainTunnelbrokerWebsocket(
  identityInfo: IdentityInfo,
) {
  const accountInfo = await fetchOlmAccount('content');
  const deviceId = JSON.parse(accountInfo.account.identity_keys()).curve25519;
  const tbConnectionInfo = await getTBConnectionInfo();

  openTunnelbrokerConnection(
    deviceId,
    identityInfo.userId,
    identityInfo.accessToken,
    tbConnectionInfo.url,
  );
}

async function handleTBMessage(message: TBMessage): Promise<void> {
  // Currently, there is only one message type which is sent from tunnelbroker
  if (TBRefreshKeysValidator.is(message)) {
    return await uploadNewOneTimeKeys(message.numberOfKeys);
  }

  throw new ServerError('invalid_tunnelbroker_message');
}

async function handleTBMessageEvent(event: MessageEvent): Promise<void> {
  invariant(
    typeof event.data === 'string',
    'Messages from tunnelbroker should be a string',
  );

  const message: TBMessage = JSON.parse(event.data);

  try {
    await handleTBMessage(message);
  } catch (e) {
    console.error('Failed to handle tunnelbroker message: ', e);
  }
}

function openTunnelbrokerConnection(
  deviceID: string,
  userID: string,
  accessToken: string,
  tbUrl: string,
) {
  try {
    const tunnelbrokerSocket = new WebSocket(tbUrl);

    tunnelbrokerSocket.on('open', () => {
      const message: TBKeyserverConnectionInitializationMessage = {
        type: 'sessionRequest',
        accessToken,
        deviceId: deviceID,
        deviceType: 'keyserver',
        userId: deviceID,
      };

      tunnelbrokerSocket.send(JSON.stringify(message));
      console.info('Connection to Tunnelbroker established');
    });

    tunnelbrokerSocket.on('close', async () => {
      console.warn('Connection to Tunnelbroker closed');
      await sleep(1000);
      console.info(
        'Attempting to re-establish Tunnelbroker connection to ',
        tbUrl,
      );
      openTunnelbrokerConnection(deviceID, userID, accessToken, tbUrl);
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error: ' + error.message);
    });

    tunnelbrokerSocket.on('message', handleTBMessageEvent);
  } catch {
    console.log('Failed to open connection with Tunnelbroker');
  }
}

export { createAndMaintainTunnelbrokerWebsocket };
