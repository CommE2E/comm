// @flow

import invariant from 'invariant';
import * as React from 'react';

import { logTypes, useDebugLogs } from './debug-logs-context.js';
import { useUserDataRestore } from '../backup/use-user-data-restore.js';
import { qrCodeLinkURL } from '../facts/links.js';
import { useSecondaryDeviceLogIn } from '../hooks/login-hooks.js';
import { uintArrayToHexString } from '../media/data-utils.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { platformToIdentityDeviceType } from '../types/identity-service-types.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import {
  type TunnelbrokerToDeviceMessage,
  tunnelbrokerToDeviceMessageTypes,
} from '../types/tunnelbroker/messages.js';
import {
  peerToPeerMessageTypes,
  peerToPeerMessageValidator,
  type QRCodeAuthMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  type QRCodeAuthMessagePayload,
  qrCodeAuthMessageTypes,
  type QRAuthBackupData,
} from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { useSelector } from '../utils/redux-utils.js';
import { fullBackupSupport } from '../utils/services-utils.js';
import { waitUntilDatabaseDeleted } from '../utils/wait-until-db-deleted.js';

type Props = {
  +children: React.Node,
  +onLogInError: (error: mixed, isUserDataRestoreError?: boolean) => void,
  +generateAESKey: () => Promise<Uint8Array>,
  +composeTunnelbrokerQRAuthMessage: (
    encryptionKey: string,
    payload: QRCodeAuthMessagePayload,
  ) => Promise<QRCodeAuthMessage>,
  +parseTunnelbrokerQRAuthMessage: (
    encryptionKey: string,
    message: QRCodeAuthMessage,
  ) => Promise<?QRCodeAuthMessagePayload>,
};

type QRData = ?{ +deviceID: string, +aesKey: string };

type SecondaryDeviceQRAuthContextType = {
  +qrData: QRData,
  +openSecondaryQRAuth: () => Promise<void>,
  +closeSecondaryQRAuth: () => void,
  +canGenerateQRs: boolean,
  +qrAuthInProgress: boolean,
};

const SecondaryDeviceQRAuthContext: React.Context<?SecondaryDeviceQRAuthContextType> =
  React.createContext<?SecondaryDeviceQRAuthContextType>({
    qrData: null,
    openSecondaryQRAuth: async () => {},
    closeSecondaryQRAuth: () => {},
    canGenerateQRs: true,
    qrAuthInProgress: false,
  });

function SecondaryDeviceQRAuthContextProvider(props: Props): React.Node {
  const {
    children,
    onLogInError,
    generateAESKey,
    composeTunnelbrokerQRAuthMessage,
    parseTunnelbrokerQRAuthMessage,
  } = props;

  const [primaryDeviceID, setPrimaryDeviceID] = React.useState<?string>();
  const [qrData, setQRData] = React.useState<?QRData>();

  const [qrAuthState, setQRAuthState] = React.useState<
    'not_started' | 'started' | 'finished',
  >('not_started');
  const qrAuthFinished = qrAuthState === 'finished';

  const loggedIn = useSelector(isLoggedIn);
  const prevLoggedIn = React.useRef(loggedIn);

  const logoutStateResetPromise = React.useRef<?Promise<void>>(null);

  if (prevLoggedIn.current !== loggedIn) {
    if (!loggedIn) {
      logoutStateResetPromise.current = (async () => {
        await logoutStateResetPromise.current;
        await waitUntilDatabaseDeleted();
        logoutStateResetPromise.current = null;
      })();
    }

    prevLoggedIn.current = loggedIn;
  }

  const {
    setUnauthorizedDeviceID,
    addListener,
    removeListener,
    socketState,
    sendMessageToDevice,
    confirmMessageToTunnelbroker,
  } = useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  const identityClient = identityContext?.identityClient;

  const openSecondaryQRAuth = React.useCallback(async () => {
    await logoutStateResetPromise.current;

    const [ed25519, rawAESKey] = await Promise.all([
      getContentSigningKey(),
      generateAESKey(),
    ]);
    const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

    setUnauthorizedDeviceID(ed25519);
    setQRData({ deviceID: ed25519, aesKey: aesKeyAsHexString });
    setQRAuthState('not_started');
  }, [generateAESKey, setUnauthorizedDeviceID]);

  const closeSecondaryQRAuth = React.useCallback(() => {
    setUnauthorizedDeviceID(null);
  }, [setUnauthorizedDeviceID]);

  const logInSecondaryDevice = useSecondaryDeviceLogIn();
  const performLogIn = React.useCallback(
    async (userID: string): Promise<?IdentityAuthResult> => {
      try {
        return await logInSecondaryDevice(userID);
      } catch (err) {
        onLogInError(err);
        void openSecondaryQRAuth();
        return null;
      }
    },
    [logInSecondaryDevice, onLogInError, openSecondaryQRAuth],
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
      try {
        const message = await composeTunnelbrokerQRAuthMessage(qrData?.aesKey, {
          type: qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS,
        });
        await sendMessageToDevice({
          deviceID: primaryDeviceID,
          payload: JSON.stringify(message),
        });
      } catch (e) {
        // QR auth already succeeded at this point. If sending this message
        // fails, primary device will timeout and display the "Device not
        // responding" screen, but user can ignore it because the device
        // is functional and working
        const errorMessage = getMessageForException(e);
        console.log(
          'Failed to send registration success message:',
          errorMessage,
        );
      }
      setQRAuthState('finished');
      setQRData(null);
    })();
  }, [
    sendMessageToDevice,
    primaryDeviceID,
    qrData,
    socketState,
    composeTunnelbrokerQRAuthMessage,
    qrAuthFinished,
  ]);

  const { addLog } = useDebugLogs();
  const userDataRestore = useUserDataRestore();
  const restoreUserData = React.useCallback(
    async (
      backupData: ?QRAuthBackupData,
      identityAuthResult: ?IdentityAuthResult,
    ) => {
      if (!fullBackupSupport) {
        return;
      }
      try {
        if (!identityAuthResult) {
          throw new Error('Missing identityAuthResult');
        }
        if (!backupData) {
          throw new Error('Missing backupData');
        }
        await userDataRestore(backupData, identityAuthResult);
      } catch (e) {
        addLog(
          'Error when restoring User Data',
          getMessageForException(e) ?? 'unknown error',
          new Set([logTypes.BACKUP, logTypes.ERROR]),
        );
        onLogInError(e, true);
      }
    },
    [addLog, onLogInError, userDataRestore],
  );

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerToDeviceMessage) => {
      invariant(identityClient, 'identity context not set');
      if (
        !qrData?.aesKey ||
        message.type !== tunnelbrokerToDeviceMessageTypes.MESSAGE_TO_DEVICE ||
        socketState.isAuthorized ||
        loggedIn
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
        qrCodeAuthMessage = await parseTunnelbrokerQRAuthMessage(
          qrData?.aesKey,
          innerMessage,
        );
      } catch (err) {
        console.warn('Failed to decrypt Tunnelbroker QR auth message:', err);
        return;
      }

      if (
        !qrCodeAuthMessage ||
        qrCodeAuthMessage.type !==
          qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS
      ) {
        return;
      }
      const {
        primaryDeviceID: receivedPrimaryDeviceID,
        userID,
        backupData,
      } = qrCodeAuthMessage;
      setPrimaryDeviceID(receivedPrimaryDeviceID);
      setQRAuthState('started');

      try {
        await confirmMessageToTunnelbroker(message.messageID);
      } catch (e) {
        console.error(
          'Error while confirming DEVICE_LIST_UPDATE_SUCCESS',
          getMessageForException(e),
        );
      }

      const identityAuthResult = await performLogIn(userID);
      await restoreUserData(backupData, identityAuthResult);
      setUnauthorizedDeviceID(null);
    },
    [
      identityClient,
      qrData?.aesKey,
      socketState.isAuthorized,
      loggedIn,
      performLogIn,
      restoreUserData,
      setUnauthorizedDeviceID,
      parseTunnelbrokerQRAuthMessage,
      confirmMessageToTunnelbroker,
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

  const value = React.useMemo(
    () => ({
      qrData,
      openSecondaryQRAuth,
      closeSecondaryQRAuth,
      canGenerateQRs: !socketState.isAuthorized,
      qrAuthInProgress: qrAuthState === 'started',
    }),
    [
      qrData,
      openSecondaryQRAuth,
      closeSecondaryQRAuth,
      socketState.isAuthorized,
      qrAuthState,
    ],
  );

  return (
    <SecondaryDeviceQRAuthContext.Provider value={value}>
      {children}
    </SecondaryDeviceQRAuthContext.Provider>
  );
}

function useSecondaryDeviceQRAuthContext(): SecondaryDeviceQRAuthContextType {
  const context = React.useContext(SecondaryDeviceQRAuthContext);
  invariant(context, 'SecondaryDeviceQRAuthContext not found');

  return context;
}

function useSecondaryDeviceQRAuthURL(): ?string {
  const { qrData, openSecondaryQRAuth, closeSecondaryQRAuth, canGenerateQRs } =
    useSecondaryDeviceQRAuthContext();

  const [attemptNumber, setAttemptNumber] = React.useState(0);

  React.useEffect(() => {
    if (!canGenerateQRs || qrData) {
      return;
    }
    void (async () => {
      try {
        console.log('Generating new QR code');
        await openSecondaryQRAuth();
      } catch (e) {
        console.log('Failed to generate QR Code:', e);
        setTimeout(() => setAttemptNumber(attemptNumber + 1), 500);
      }
    })();
  }, [
    closeSecondaryQRAuth,
    canGenerateQRs,
    openSecondaryQRAuth,
    attemptNumber,
    qrData,
  ]);

  React.useEffect(() => {
    return closeSecondaryQRAuth;
  }, [closeSecondaryQRAuth]);

  const { platform } = getConfig().platformDetails;
  const qrCodeURL = React.useMemo(() => {
    if (!qrData || !canGenerateQRs) {
      return undefined;
    }

    const identityDeviceType = platformToIdentityDeviceType[platform];

    return qrCodeLinkURL(qrData.aesKey, qrData.deviceID, identityDeviceType);
  }, [canGenerateQRs, platform, qrData]);

  React.useEffect(() => {
    if (qrCodeURL) {
      console.log(`QR Code URL: ${qrCodeURL}`);
    }
  }, [qrCodeURL]);

  return qrCodeURL;
}

export {
  SecondaryDeviceQRAuthContextProvider,
  useSecondaryDeviceQRAuthContext,
  useSecondaryDeviceQRAuthURL,
};
