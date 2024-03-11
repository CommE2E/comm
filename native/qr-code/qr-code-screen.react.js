// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { qrCodeLinkURL } from 'lib/facts/links.js';
import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type {
  NonceChallenge,
  SignedMessage,
} from 'lib/types/identity-service-types.js';
import {
  tunnelbrokerMessageTypes,
  type TunnelbrokerMessage,
} from 'lib/types/tunnelbroker/messages.js';
import {
  peerToPeerMessageTypes,
  peerToPeerMessageValidator,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import { qrCodeAuthMessageTypes } from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import {
  createQRAuthTunnelbrokerMessage,
  parseQRAuthTunnelbrokerMessage,
} from 'lib/utils/qr-code-auth.js';

import type { QRCodeSignInNavigationProp } from './qr-code-sign-in-navigator.react.js';
import { commCoreModule } from '../native-modules.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import * as AES from '../utils/aes-crypto-module.js';
import Alert from '../utils/alert.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type QRCodeScreenProps = {
  +navigation: QRCodeSignInNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

// eslint-disable-next-line no-unused-vars
function QRCodeScreen(props: QRCodeScreenProps): React.Node {
  const [qrCodeValue, setQrCodeValue] = React.useState<?string>();
  const [qrData, setQRData] =
    React.useState<?{ +deviceID: string, +aesKey: string }>();
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
      !tunnelbrokerConnected ||
      !isAuthorized ||
      !primaryDeviceID ||
      !qrData
    ) {
      return;
    }

    const message = createQRAuthTunnelbrokerMessage(qrData.aesKey, {
      type: qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS,
    });
    void sendMessage({
      deviceID: primaryDeviceID,
      payload: JSON.stringify(message),
    });
  }, [
    tunnelbrokerConnected,
    isAuthorized,
    sendMessage,
    primaryDeviceID,
    qrData,
  ]);

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerMessage) => {
      invariant(identityClient, 'identity context not set');
      if (
        !qrData ||
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
      const qrCodeAuthMessage = parseQRAuthTunnelbrokerMessage(
        qrData.aesKey,
        innerMessage,
      );

      if (
        qrCodeAuthMessage?.type ===
        qrCodeAuthMessageTypes.BACKUP_DATA_KEY_MESSAGE
      ) {
        console.log('Received backup data key:', qrCodeAuthMessage);
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
        const nonce = await identityClient.generateNonce();
        const nonceChallenge: NonceChallenge = { nonce };
        const nonceMessage = JSON.stringify(nonceChallenge);
        const signature = await commCoreModule.signMessage(nonceMessage);
        const challengeResponse: SignedMessage = {
          message: nonceMessage,
          signature,
        };

        await identityClient.uploadKeysForRegisteredDeviceAndLogIn(
          userID,
          challengeResponse,
        );
        setUnauthorizedDeviceID(null);
      } catch (err) {
        console.error('Secondary device registration error:', err);
        Alert.alert('Registration failed', 'Failed to upload device keys', [
          { text: 'OK' },
        ]);
      }
    },
    [setUnauthorizedDeviceID, identityClient, qrData],
  );

  React.useEffect(() => {
    if (!qrData) {
      return undefined;
    }
    addListener(tunnelbrokerMessageListener);
    setUnauthorizedDeviceID(qrData.deviceID);

    return () => {
      removeListener(tunnelbrokerMessageListener);
      setUnauthorizedDeviceID(null);
    };
  }, [
    setUnauthorizedDeviceID,
    qrData,
    addListener,
    removeListener,
    tunnelbrokerMessageListener,
  ]);

  const generateQRCode = React.useCallback(async () => {
    try {
      const rawAESKey: Uint8Array = await AES.generateKey();
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      const ed25519Key: string = await getContentSigningKey();

      const url = qrCodeLinkURL(aesKeyAsHexString, ed25519Key);
      setQrCodeValue(url);
      setQRData({ deviceID: ed25519Key, aesKey: aesKeyAsHexString });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, []);

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Log in to Comm</Text>
      <Text style={styles.headingSubtext}>
        Open the Comm app on your phone and scan the QR code below
      </Text>
      <QRCode value={qrCodeValue} size={200} />
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>How to find the scanner:</Text>
        <Text style={styles.instructionsStep}>
          <Text>Go to </Text>
          <Text style={styles.instructionsBold}>Profile</Text>
        </Text>
        <Text style={styles.instructionsStep}>
          <Text>Select </Text>
          <Text style={styles.instructionsBold}>Linked devices </Text>
        </Text>
        <Text style={styles.instructionsStep}>
          <Text>Click </Text>
          <Text style={styles.instructionsBold}>Add </Text>
          <Text>on the top right</Text>
        </Text>
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 125,
  },
  heading: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 12,
  },
  headingSubtext: {
    fontSize: 12,
    color: 'panelForegroundLabel',
    paddingBottom: 30,
  },
  instructionsBox: {
    alignItems: 'center',
    width: 300,
    marginTop: 40,
    padding: 15,
    borderColor: 'panelForegroundLabel',
    borderWidth: 2,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 12,
    color: 'panelForegroundLabel',
    paddingBottom: 15,
  },
  instructionsStep: {
    fontSize: 12,
    padding: 1,
    color: 'panelForegroundLabel',
  },
  instructionsBold: {
    fontWeight: 'bold',
  },
};

export default QRCodeScreen;
