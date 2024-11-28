// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useQRAuthContext } from 'lib/components/qr-auth-provider.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { platformToIdentityDeviceType } from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';

import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type QRCodeScreenProps = {
  +navigation: SignInNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

// eslint-disable-next-line no-unused-vars
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
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <View style={styles.container}>
          <Text style={styles.heading}>Log in to Comm</Text>
          <Text style={styles.headingSubtext}>
            Open the Comm app on your logged-in phone and scan the QR code below
          </Text>
          <View style={styles.qrCodeContainer}>
            <QRCode value={qrCodeURL} size={200} />
          </View>
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>
              How to find the scanner:
            </Text>
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
      </RegistrationContentContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
  heading: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  headingSubtext: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 32,
  },
  instructionsBox: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 32,
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
  qrCodeContainer: {
    padding: 5,
    backgroundColor: 'panelForegroundLabel',
    alignSelf: 'center',
  },
};

export default QRCodeScreen;
