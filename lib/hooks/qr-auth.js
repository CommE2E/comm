// @flow

import invariant from 'invariant';
import * as React from 'react';

import { removeAllPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
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
import { useDispatch } from '../utils/redux-utils.js';

type QRAuthHandlerInput = {
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
  +performBackupRestore?: (backupKeys: BackupKeys) => Promise<void>,
};

function useQRAuth(input: QRAuthHandlerInput) {
  const {
    secondaryDeviceID,
    aesKey,
    processMessage,
    composeMessage,
    performSecondaryDeviceRegistration,
    performBackupRestore,
  } = input;
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

  const dispatch = useDispatch();

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

      let qrCodeAuthMessage;
      try {
        qrCodeAuthMessage = await processMessage(aesKey, innerMessage);
      } catch (err) {
        console.warn('Failed to decrypt Tunnelbroker QR auth message:', err);
        return;
      }

      if (
        qrCodeAuthMessage &&
        qrCodeAuthMessage.type ===
          qrCodeAuthMessageTypes.BACKUP_DATA_KEY_MESSAGE
      ) {
        const { backupID, backupDataKey, backupLogDataKey } = qrCodeAuthMessage;
        await performBackupRestore?.({
          backupID,
          backupDataKey,
          backupLogDataKey,
        });
        dispatch({ type: removeAllPeerDeviceListsActionType });
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
      identityClient,
      aesKey,
      performSecondaryDeviceRegistration,
      setUnauthorizedDeviceID,
      processMessage,
      performBackupRestore,
      dispatch,
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
}

export { useQRAuth };
