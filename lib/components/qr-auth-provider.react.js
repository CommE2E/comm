// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useSecondaryDeviceLogIn } from '../hooks/login-hooks.js';
import { uintArrayToHexString } from '../media/data-utils.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { BackupKeys } from '../types/backup-types.js';
import {
  tunnelbrokerMessageTypes,
  type TunnelbrokerMessage,
} from '../types/tunnelbroker/messages.js';
import {
  type QRCodeAuthMessage,
  peerToPeerMessageTypes,
  peerToPeerMessageValidator,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessageTypes,
  type QRCodeAuthMessagePayload,
} from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type Props = {
  +children: React.Node,
  +onError: (error: Error) => void,
  +generateKey: () => Promise<Uint8Array>,
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

type QRData = ?{ +deviceID: string, +aesKey: string };

type QRAuthContextType = {
  +qrData: QRData,
  +generateQRCode: () => Promise<void>,
};

const QRAuthContext: React.Context<?QRAuthContextType> =
  React.createContext<?QRAuthContextType>({
    qrData: null,
    generateQRCode: async () => {},
  });

function QRAuthProvider(props: Props): React.Node {
  const {
    children,
    onError,
    generateKey,
    composeMessage,
    processMessage,
    performBackupRestore,
  } = props;

  const [qrData, setQRData] =
    React.useState<?{ +deviceID: string, +aesKey: string }>();
  const [primaryDeviceID, setPrimaryDeviceID] = React.useState<?string>();
  const [qrAuthFinished, setQRAuthFinished] = React.useState(false);

  const {
    setUnauthorizedDeviceID,
    addListener,
    removeListener,
    socketState,
    sendMessage,
  } = useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  const identityClient = identityContext?.identityClient;

  const generateQRCode = React.useCallback(async () => {
    try {
      const [ed25519, rawAESKey] = await Promise.all([
        getContentSigningKey(),
        generateKey(),
      ]);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      setUnauthorizedDeviceID(ed25519);
      setQRData({ deviceID: ed25519, aesKey: aesKeyAsHexString });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [generateKey, setUnauthorizedDeviceID]);

  const logInSecondaryDevice = useSecondaryDeviceLogIn();
  const performRegistration = React.useCallback(
    async (userID: string) => {
      try {
        await logInSecondaryDevice(userID);
      } catch (err) {
        onError(err);
        void generateQRCode();
      }
    },
    [logInSecondaryDevice, onError, generateQRCode],
  );

  React.useEffect(() => {
    if (
      !qrData ||
      !socketState.isAuthorized ||
      !primaryDeviceID ||
      qrAuthFinished
    ) {
      return;
    }

    void (async () => {
      const message = await composeMessage(qrData?.aesKey, {
        type: qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS,
        requestBackupKeys: true,
      });
      await sendMessage({
        deviceID: primaryDeviceID,
        payload: JSON.stringify(message),
      });
    })();
  }, [
    sendMessage,
    primaryDeviceID,
    qrData,
    composeMessage,
    socketState,
    qrAuthFinished,
  ]);

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerMessage) => {
      invariant(identityClient, 'identity context not set');
      if (
        !qrData?.aesKey ||
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
        qrCodeAuthMessage = await processMessage(qrData?.aesKey, innerMessage);
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
        void performBackupRestore?.({
          backupID,
          backupDataKey,
          backupLogDataKey,
        });
        setQRAuthFinished(true);
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

      await performRegistration(userID);
      setUnauthorizedDeviceID(null);
    },
    [
      identityClient,
      qrData?.aesKey,
      performRegistration,
      setUnauthorizedDeviceID,
      processMessage,
      performBackupRestore,
    ],
  );

  React.useEffect(() => {
    if (!qrData?.deviceID || qrAuthFinished) {
      return undefined;
    }

    addListener(tunnelbrokerMessageListener);
    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [
    addListener,
    removeListener,
    tunnelbrokerMessageListener,
    qrData?.deviceID,
    qrAuthFinished,
  ]);

  React.useEffect(() => {
    if (qrAuthFinished) {
      removeListener(tunnelbrokerMessageListener);
    }
  }, [qrAuthFinished, removeListener, tunnelbrokerMessageListener]);

  const value = React.useMemo(
    () => ({
      qrData,
      generateQRCode,
    }),
    [qrData, generateQRCode],
  );

  return (
    <QRAuthContext.Provider value={value}>{children}</QRAuthContext.Provider>
  );
}

function useQRAuthContext(): QRAuthContextType {
  const context = React.useContext(QRAuthContext);
  invariant(context, 'QRAuthContext not found');

  return context;
}

export { QRAuthProvider, useQRAuthContext };
