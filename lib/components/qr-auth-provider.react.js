// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useSecondaryDeviceLogIn } from '../hooks/login-hooks.js';
import { useQRAuth } from '../hooks/qr-auth.js';
import { uintArrayToHexString } from '../media/data-utils.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { BackupKeys } from '../types/backup-types.js';
import type { QRCodeAuthMessage } from '../types/tunnelbroker/peer-to-peer-message-types.js';
import type { QRCodeAuthMessagePayload } from '../types/tunnelbroker/qr-code-auth-message-types.js';
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

  const { setUnauthorizedDeviceID } = useTunnelbroker();

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

  const qrAuthInput = React.useMemo(
    () => ({
      secondaryDeviceID: qrData?.deviceID,
      aesKey: qrData?.aesKey,
      performSecondaryDeviceRegistration: performRegistration,
      composeMessage,
      processMessage,
      performBackupRestore,
    }),
    [
      composeMessage,
      performBackupRestore,
      performRegistration,
      processMessage,
      qrData?.aesKey,
      qrData?.deviceID,
    ],
  );
  useQRAuth(qrAuthInput);

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
