// @flow

import WebSocket from 'ws';

import {
  refreshKeysTBMessageValidator,
  type TBKeyserverConnectionInitializationMessage,
  type MessageFromTunnelbroker,
  tunnelbrokerMessageTypes,
} from 'lib/types/tunnelbroker-messages.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { ServerError } from 'lib/utils/errors.js';

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

  console.warn('Defaulting to local Tunnelbroker instance');
  return {
    url: 'ws://127.0.0.1:51001',
  };
}

async function createAndMaintainTunnelbrokerWebsocket(
  identityInfo: IdentityInfo,
) {
  const [accountInfo, tbConnectionInfo] = await Promise.all([
    fetchOlmAccount('content'),
    getTBConnectionInfo(),
  ]);

  const deviceID = JSON.parse(accountInfo.account.identity_keys()).ed25519;

  openTunnelbrokerConnection(
    deviceID,
    identityInfo.userId,
    identityInfo.accessToken,
    tbConnectionInfo.url,
  );
}

function handleTBMessageEvent(event: ArrayBuffer): Promise<void> {
  const rawMessage = JSON.parse(event.toString());
  if (!refreshKeysTBMessageValidator.is(rawMessage)) {
    throw new ServerError('unsupported_tunnelbroker_message');
  }
  const message: MessageFromTunnelbroker = rawMessage;

  if (message.type === tunnelbrokerMessageTypes.REFRESH_KEYS_REQUEST) {
    return uploadNewOneTimeKeys(message.numberOfKeys);
  }
  throw new ServerError('unsupported_tunnelbroker_message');
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
        userId: userID,
      };

      tunnelbrokerSocket.send(JSON.stringify(message));
      console.info('Connection to Tunnelbroker established');
    });

    tunnelbrokerSocket.on('close', async () => {
      console.warn('Connection to Tunnelbroker closed');
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error', error.message);
    });

    tunnelbrokerSocket.on('message', handleTBMessageEvent);
  } catch {
    console.log('Failed to open connection with Tunnelbroker');
  }
}

export { createAndMaintainTunnelbrokerWebsocket };
