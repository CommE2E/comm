// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useQRAuthContext } from 'lib/components/qr-auth-provider.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { platformToIdentityDeviceType } from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';
import { usingRestoreFlow } from 'lib/utils/services-utils.js';

import type { QRCodeSignInNavigationProp } from './qr-code-sign-in-navigator.react.js';
import LinkButton from '../components/link-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { LoggedOutModalRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type QRCodeScreenProps = {
  +navigation: QRCodeSignInNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

function QRCodeScreen(props: QRCodeScreenProps): React.Node {
  const { qrData, generateQRCode } = useQRAuthContext();

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const { platform } = getConfig().platformDetails;
  const qrCodeURL = React.useMemo(() => {
    if (!qrData) {
      return undefined;
    }

    const deviceType = platformToIdentityDeviceType[platform];
    return qrCodeLinkURL(qrData.aesKey, qrData.deviceID, deviceType);
  }, [platform, qrData]);

  const styles = useStyles(unboundStyles);

  const goToRestoreFlow = React.useCallback(() => {
    props.navigation.navigate(LoggedOutModalRouteName, {
      mode: 'restore',
    });
  }, [props.navigation]);

  let primaryRestoreButton = null;
  if (usingRestoreFlow) {
    primaryRestoreButton = (
      <View style={styles.primaryRestoreButton}>
        <LinkButton
          text="Not logged in on another phone?"
          onPress={goToRestoreFlow}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.container}>
        <Text style={styles.heading}>Log in to Comm</Text>
        <Text style={styles.headingSubtext}>
          Open the Comm app on your primary device and scan the QR code below
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
      {primaryRestoreButton}
    </View>
  );
}

const unboundStyles = {
  screenContainer: {
    flex: 1,
  },
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
    textAlign: 'center',
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
  primaryRestoreButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
};

export default QRCodeScreen;
