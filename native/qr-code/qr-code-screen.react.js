// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { QRAuthHandler } from 'lib/components/qr-auth-handler.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type {
  NonceChallenge,
  SignedMessage,
} from 'lib/types/identity-service-types.js';

import type { QRCodeSignInNavigationProp } from './qr-code-sign-in-navigator.react.js';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
} from './qr-code-utils.js';
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
  const { setUnauthorizedDeviceID } = useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  const identityClient = identityContext?.identityClient;

  const performRegistration = React.useCallback(
    async (userID: string) => {
      invariant(identityClient, 'identity context not set');
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
    [setUnauthorizedDeviceID, identityClient],
  );

  const generateQRCode = React.useCallback(async () => {
    try {
      const rawAESKey: Uint8Array = await AES.generateKey();
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      const ed25519Key: string = await getContentSigningKey();

      const url = qrCodeLinkURL(aesKeyAsHexString, ed25519Key);
      setUnauthorizedDeviceID(ed25519Key);
      setQrCodeValue(url);
      setQRData({ deviceID: ed25519Key, aesKey: aesKeyAsHexString });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [setUnauthorizedDeviceID]);

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const styles = useStyles(unboundStyles);
  return (
    <>
      <QRAuthHandler
        secondaryDeviceID={qrData?.deviceID}
        aesKey={qrData?.aesKey}
        performSecondaryDeviceRegistration={performRegistration}
        composeMessage={composeTunnelbrokerQRAuthMessage}
        processMessage={parseTunnelbrokerQRAuthMessage}
      />
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
    </>
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
