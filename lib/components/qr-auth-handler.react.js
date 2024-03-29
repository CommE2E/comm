// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { BackupKeys } from '../types/backup-types.js';
import {
  tunnelbrokerMessageTypes,
  type TunnelbrokerMessage,
} from '../types/tunnelbroker/messages.js';
import {
  peerToPeerMessageTypes,
  peerToPeerMessageValidator,
  type QRCodeAuthMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessageTypes,
  type QRCodeAuthMessagePayload,
} from '../types/tunnelbroker/qr-code-auth-message-types.js';

type QRAuthHandlerProps = {
  +secondaryDeviceID: ?string,
  +aesKey: ?string,
  +performSecondaryDeviceRegistration: (userID: string) => Promise<void>,
  +composeMessage: (
    encryptionKey: string,
    payload: QRCodeAuthMessagePayload,
  ) => Promise<QRCodeAuthMessage>,
  +processMessage: (
    encryptionKey: string,
    message: QRCodeAuthMessage,
  ) => Promise<?QRCodeAuthMessagePayload>,
  performBackupRestore?: (backupKeys: BackupKeys) => Promise<void>,
};

function QRAuthHandler(props: QRAuthHandlerProps): React.Node {
  const {
    secondaryDeviceID,
    aesKey,
    processMessage,
    composeMessage,
    performSecondaryDeviceRegistration,
    performBackupRestore,
  } = props;
  const [primaryDeviceID, setPrimaryDeviceID] = React.useState<?string>();
  const {
    setUnauthorizedDeviceID,
    addListener,
    removeListener,
    connected: tunnelbrokerConnected,
    isAuthorized,
    sendMessage,
  } = useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  const identityClient = identityContext?.identityClient;

  React.useEffect(() => {
    if (
      !secondaryDeviceID ||
      !aesKey ||
      !tunnelbrokerConnected ||
      !isAuthorized ||
      !primaryDeviceID
    ) {
      return;
    }

    void (async () => {
      const message = await composeMessage(aesKey, {
        type: qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS,
      });
      await sendMessage({
        deviceID: primaryDeviceID,
        payload: JSON.stringify(message),
      });
    })();
  }, [
    tunnelbrokerConnected,
    isAuthorized,
    sendMessage,
    primaryDeviceID,
    aesKey,
    secondaryDeviceID,
    composeMessage,
  ]);

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerMessage) => {
      invariant(identityClient, 'identity context not set');
      if (
        !aesKey ||
        message.type !== tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE
      ) {
        return;
      }

      let innerMessage;
      try {
        innerMessage = JSON.parse(message.payload);
      } catch {
        return;
      }
      if (
        !peerToPeerMessageValidator.is(innerMessage) ||
        innerMessage.type !== peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE
      ) {
        return;
      }
      const qrCodeAuthMessage = await processMessage(aesKey, innerMessage);

      if (
        qrCodeAuthMessage &&
        qrCodeAuthMessage.type ===
          qrCodeAuthMessageTypes.BACKUP_DATA_KEY_MESSAGE
      ) {
        const { backupID, backupDataKey, backupLogDataKey } = qrCodeAuthMessage;
        void performBackupRestore?.({
          backupID,
          backupDataKey,
          backupLogDataKey,
        });
        return;
      }

      if (
        !qrCodeAuthMessage ||
        qrCodeAuthMessage.type !==
          qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS
      ) {
        return;
      }
      const { primaryDeviceID: receivedPrimaryDeviceID, userID } =
        qrCodeAuthMessage;
      setPrimaryDeviceID(receivedPrimaryDeviceID);

      await performSecondaryDeviceRegistration(userID);
      setUnauthorizedDeviceID(null);
    },
    [
      setUnauthorizedDeviceID,
      identityClient,
      aesKey,
      performSecondaryDeviceRegistration,
      performBackupRestore,
      processMessage,
    ],
  );

  React.useEffect(() => {
    if (!secondaryDeviceID) {
      return undefined;
    }

    addListener(tunnelbrokerMessageListener);
    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [
    secondaryDeviceID,
    addListener,
    removeListener,
    tunnelbrokerMessageListener,
  ]);
  return null;
}

export { QRAuthHandler };
