// @flow

import invariant from 'invariant';
import * as React from 'react';

import { qrCodeLinkURL } from '../facts/links.js';
import { useSecondaryDeviceLogIn } from '../hooks/login-hooks.js';
import { uintArrayToHexString } from '../media/data-utils.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { platformToIdentityDeviceType } from '../types/identity-service-types.js';
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
  type QRAuthBackupData,
  type QRCodeAuthMessagePayload,
  qrCodeAuthMessageTypes,
} from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { useSelector } from '../utils/redux-utils.js';

type Props = {
  +children: React.Node,
  +onLogInError: (error: mixed) => void,
  +generateAESKey: () => Promise<Uint8Array>,
  +composeTunnelbrokerQRAuthMessage: (
    encryptionKey: string,
    payload: QRCodeAuthMessagePayload,
  ) => Promise<QRCodeAuthMessage>,
  +parseTunnelbrokerQRAuthMessage: (
    encryptionKey: string,
    message: QRCodeAuthMessage,
  ) => Promise<?QRCodeAuthMessagePayload>,
  +performBackupRestore?: (qrAuthBackupData: QRAuthBackupData) => Promise<void>,
};

type QRData = ?{ +deviceID: string, +aesKey: string };

type SecondaryDeviceQRAuthContextType = {
  +qrData: QRData,
  +openSecondaryQRAuth: () => Promise<void>,
  +closeSecondaryQRAuth: () => void,
  +isAuthorized: boolean,
};

const SecondaryDeviceQRAuthContext: React.Context<?SecondaryDeviceQRAuthContextType> =
  React.createContext<?SecondaryDeviceQRAuthContextType>({
    qrData: null,
    openSecondaryQRAuth: async () => {},
    closeSecondaryQRAuth: () => {},
    isAuthorized: false,
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
  const [qrAuthFinished, setQRAuthFinished] = React.useState(false);
  const loggedIn = useSelector(isLoggedIn);

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
    try {
      const [ed25519, rawAESKey] = await Promise.all([
        getContentSigningKey(),
        generateAESKey(),
      ]);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      setUnauthorizedDeviceID(ed25519);
      setQRData({ deviceID: ed25519, aesKey: aesKeyAsHexString });
      setQRAuthFinished(false);
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [generateAESKey, setUnauthorizedDeviceID]);

  const closeSecondaryQRAuth = React.useCallback(() => {
    setUnauthorizedDeviceID(null);
  }, [setUnauthorizedDeviceID]);

  const logInSecondaryDevice = useSecondaryDeviceLogIn();
  const performLogIn = React.useCallback(
    async (userID: string) => {
      try {
        await logInSecondaryDevice(userID);
      } catch (err) {
        onLogInError(err);
        void openSecondaryQRAuth();
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
      const message = await composeTunnelbrokerQRAuthMessage(qrData?.aesKey, {
        type: qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS,
      });
      await sendMessageToDevice({
        deviceID: primaryDeviceID,
        payload: JSON.stringify(message),
      });
      setQRAuthFinished(true);
    })();
  }, [
    sendMessageToDevice,
    primaryDeviceID,
    qrData,
    socketState,
    composeTunnelbrokerQRAuthMessage,
    qrAuthFinished,
  ]);

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
      const { primaryDeviceID: receivedPrimaryDeviceID, userID } =
        qrCodeAuthMessage;
      setPrimaryDeviceID(receivedPrimaryDeviceID);

      try {
        await confirmMessageToTunnelbroker(message.messageID);
      } catch (e) {
        console.error(
          'Error while confirming DEVICE_LIST_UPDATE_SUCCESS',
          getMessageForException(e),
        );
      }

      await performLogIn(userID);
      setUnauthorizedDeviceID(null);
    },
    [
      identityClient,
      qrData?.aesKey,
      socketState.isAuthorized,
      performLogIn,
      setUnauthorizedDeviceID,
      parseTunnelbrokerQRAuthMessage,
      confirmMessageToTunnelbroker,
      loggedIn,
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
      isAuthorized: socketState.isAuthorized ?? false,
    }),
    [
      qrData,
      openSecondaryQRAuth,
      closeSecondaryQRAuth,
      socketState.isAuthorized,
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
  const { qrData, openSecondaryQRAuth, closeSecondaryQRAuth, isAuthorized } =
    useSecondaryDeviceQRAuthContext();

  React.useEffect(() => {
    if (!isAuthorized) {
      void openSecondaryQRAuth();
      return closeSecondaryQRAuth;
    }
    return undefined;
  }, [closeSecondaryQRAuth, isAuthorized, openSecondaryQRAuth]);

  const { platform } = getConfig().platformDetails;
  const qrCodeURL = React.useMemo(() => {
    if (!qrData || isAuthorized) {
      return undefined;
    }

    const identityDeviceType = platformToIdentityDeviceType[platform];

    return qrCodeLinkURL(qrData.aesKey, qrData.deviceID, identityDeviceType);
  }, [isAuthorized, platform, qrData]);

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
