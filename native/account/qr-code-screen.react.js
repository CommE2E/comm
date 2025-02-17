// @flow

import { useFocusEffect } from '@react-navigation/core';
import * as React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useSecondaryDeviceQRAuthContext } from 'lib/components/secondary-device-qr-auth-context-provider.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { platformToIdentityDeviceType } from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';
import { useIsRestoreFlowEnabled } from 'lib/utils/services-utils.js';

import AuthButtonContainer from './auth-components/auth-button-container.react.js';
import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import LinkButton from '../components/link-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { RestorePromptScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type QRCodeScreenProps = {
  +navigation: AuthNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

function QRCodeScreen(props: QRCodeScreenProps): React.Node {
  const { qrData, openSecondaryQRAuth, closeSecondaryQRAuth, canGenerateQRs } =
    useSecondaryDeviceQRAuthContext();

  useFocusEffect(
    React.useCallback(() => {
      if (canGenerateQRs) {
        void openSecondaryQRAuth();
        return closeSecondaryQRAuth;
      }
      return undefined;
    }, [canGenerateQRs, closeSecondaryQRAuth, openSecondaryQRAuth]),
  );

  const { platform } = getConfig().platformDetails;
  const qrCodeURL = React.useMemo(() => {
    if (!qrData || !canGenerateQRs) {
      return undefined;
    }

    const deviceType = platformToIdentityDeviceType[platform];
    return qrCodeLinkURL(qrData.aesKey, qrData.deviceID, deviceType);
  }, [canGenerateQRs, platform, qrData]);

  const styles = useStyles(unboundStyles);

  const usingRestoreFlow = useIsRestoreFlowEnabled();

  let primaryRestoreButton = null;
  const goToRestoreFlow = React.useCallback(() => {
    props.navigation.navigate(RestorePromptScreenRouteName);
  }, [props.navigation]);
  if (usingRestoreFlow) {
    primaryRestoreButton = (
      <AuthButtonContainer>
        <View style={styles.primaryRestoreButton}>
          <LinkButton
            text="Not logged in on another phone?"
            onPress={goToRestoreFlow}
          />
        </View>
      </AuthButtonContainer>
    );
  }

  const { width } = useWindowDimensions();
  const qrCodeSize = width * 0.7;

  return (
    <AuthContainer>
      <AuthContentContainer>
        <View style={styles.container}>
          <Text style={styles.heading}>Log in to Comm</Text>
          <Text style={styles.headingSubtext}>
            Open the Comm app on your logged-in phone and scan the QR code
            below:
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
      </AuthContentContainer>
      {primaryRestoreButton}
    </AuthContainer>
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
