// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { qrCodeLinkURL } from 'lib/facts/links.js';
import { useSecondaryDeviceLogIn } from 'lib/hooks/login-hooks.js';
import { useQRAuth } from 'lib/hooks/qr-auth.js';
import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { BackupKeys } from 'lib/types/backup-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';

import type { QRCodeSignInNavigationProp } from './qr-code-sign-in-navigator.react.js';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
} from './qr-code-utils.js';
import { commCoreModule } from '../native-modules.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import * as AES from '../utils/aes-crypto-module.js';
import {
  appOutOfDateAlertDetails,
  unknownErrorAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type QRCodeScreenProps = {
  +navigation: QRCodeSignInNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

function performBackupRestore(backupKeys: BackupKeys): Promise<void> {
  const { backupID, backupDataKey, backupLogDataKey } = backupKeys;
  return commCoreModule.restoreBackupData(
    backupID,
    backupDataKey,
    backupLogDataKey,
  );
}

// eslint-disable-next-line no-unused-vars
function QRCodeScreen(props: QRCodeScreenProps): React.Node {
  const [qrData, setQRData] =
    React.useState<?{ +deviceID: string, +aesKey: string }>();

  const { setUnauthorizedDeviceID } = useTunnelbroker();
  const generateQRCode = React.useCallback(async () => {
    try {
      const [ed25519, rawAESKey] = await Promise.all([
        getContentSigningKey(),
        AES.generateKey(),
      ]);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      setUnauthorizedDeviceID(ed25519);
      setQRData({ deviceID: ed25519, aesKey: aesKeyAsHexString });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [setUnauthorizedDeviceID]);

  const logInSecondaryDevice = useSecondaryDeviceLogIn();
  const performRegistration = React.useCallback(
    async (userID: string) => {
      try {
        await logInSecondaryDevice(userID);
      } catch (err) {
        console.error('Secondary device registration error:', err);
        const messageForException = getMessageForException(err);
        if (
          messageForException === 'client_version_unsupported' ||
          messageForException === 'Unsupported version'
        ) {
          Alert.alert(
            appOutOfDateAlertDetails.title,
            appOutOfDateAlertDetails.message,
          );
        } else {
          Alert.alert(
            unknownErrorAlertDetails.title,
            unknownErrorAlertDetails.message,
          );
        }
        void generateQRCode();
      }
    },
    [logInSecondaryDevice, generateQRCode],
  );

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const qrCodeURL = React.useMemo(
    () => (qrData ? qrCodeLinkURL(qrData.aesKey, qrData.deviceID) : undefined),
    [qrData],
  );

  const qrAuthInput = React.useMemo(
    () => ({
      secondaryDeviceID: qrData?.deviceID,
      aesKey: qrData?.aesKey,
      performSecondaryDeviceRegistration: performRegistration,
      composeMessage: composeTunnelbrokerQRAuthMessage,
      processMessage: parseTunnelbrokerQRAuthMessage,
      performBackupRestore,
    }),
    [qrData, performRegistration],
  );
  useQRAuth(qrAuthInput);

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Log in to Comm</Text>
      <Text style={styles.headingSubtext}>
        Open the Comm app on your phone and scan the QR code below
      </Text>
      <QRCode value={qrCodeURL} size={200} />
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
