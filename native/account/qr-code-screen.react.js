// @flow

import * as React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useSecondaryDeviceQRAuthContext } from 'lib/components/secondary-device-qr-auth-context-provider.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { platformToIdentityDeviceType } from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';
import { usingRestoreFlow } from 'lib/utils/services-utils.js';

import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import LinkButton from '../components/link-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { RestorePromptScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type QRCodeScreenProps = {
  +navigation: SignInNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

function QRCodeScreen(props: QRCodeScreenProps): React.Node {
  const { qrData, generateQRCode } = useSecondaryDeviceQRAuthContext();

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

  let primaryRestoreButton = null;
  const goToRestoreFlow = React.useCallback(() => {
    props.navigation.navigate(RestorePromptScreenRouteName);
  }, [props.navigation]);
  if (usingRestoreFlow) {
    primaryRestoreButton = (
      <RegistrationButtonContainer>
        <View style={styles.primaryRestoreButton}>
          <LinkButton
            text="Not logged in on another phone?"
            onPress={goToRestoreFlow}
          />
        </View>
      </RegistrationButtonContainer>
    );
  }

  const { width } = useWindowDimensions();
  const qrCodeSize = width * 0.7;

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <View style={styles.container}>
          <Text style={styles.heading}>Log in to Comm</Text>
          <Text style={styles.headingSubtext}>
            Open the Comm app on your logged-in phone and scan the QR code below
          </Text>
          <View style={styles.qrCodeContainer}>
            <QRCode value={qrCodeURL} size={qrCodeSize} />
          </View>
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>
              How to find the scanner:
            </Text>
            <Text style={styles.instructionsStep}>
              <Text>{'\u2022 Go to '}</Text>
              <Text style={styles.instructionsBold}>Profile</Text>
            </Text>
            <Text style={styles.instructionsStep}>
              <Text>{'\u2022 Select '}</Text>
              <Text style={styles.instructionsBold}>Linked devices </Text>
            </Text>
            <Text style={styles.instructionsStep}>
              <Text>{'\u2022 Click '}</Text>
              <Text style={styles.instructionsBold}>Add </Text>
              <Text>on the top right</Text>
            </Text>
          </View>
        </View>
      </RegistrationContentContainer>
      {primaryRestoreButton}
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
    marginTop: 32,
  },
  instructionsTitle: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 15,
  },
  instructionsStep: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    padding: 1,
    color: 'panelForegroundTertiaryLabel',
  },
  instructionsBold: {
    fontWeight: 'bold',
  },
  qrCodeContainer: {
    padding: 5,
    backgroundColor: 'panelForegroundLabel',
    alignSelf: 'center',
  },
  primaryRestoreButton: {
    alignItems: 'center',
  },
};

export default QRCodeScreen;
