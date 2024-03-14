// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import {
  tunnelbrokerMessageTypes,
  type TunnelbrokerMessage,
} from '../types/tunnelbroker/messages.js';
import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessageTypes,
  type QRCodeAuthMessagePayload,
} from '../types/tunnelbroker/qr-code-auth-message-types.js';

type QRAuthHandlerProps = {
  secondaryDeviceID: ?string,
  aesKey: ?string,
  performSecondaryDeviceRegistration: (userID: string) => Promise<void>,
  composeMessage: (
    encryptionKey: string,
    payload: QRCodeAuthMessagePayload,
  ) => Promise<QRCodeAuthMessage>,
  processMessage: (
    encryptionKey: string,
    message: QRCodeAuthMessage,
  ) => Promise<?QRCodeAuthMessagePayload>,
};

function QRAuthHandler(props: QRAuthHandlerProps): React.Node {
  const {
    secondaryDeviceID,
    aesKey,
    processMessage,
    composeMessage,
    performSecondaryDeviceRegistration,
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

      const innerMessage = JSON.parse(message.payload);
      if (innerMessage.type !== peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE) {
        return;
      }
      const qrCodeAuthMessage = await processMessage(aesKey, innerMessage);

      if (
        qrCodeAuthMessage?.type ===
        qrCodeAuthMessageTypes.BACKUP_DATA_KEY_MESSAGE
      ) {
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
      processMessage,
    ],
  );

  React.useEffect(() => {
    if (!secondaryDeviceID) {
      return () => {};
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
