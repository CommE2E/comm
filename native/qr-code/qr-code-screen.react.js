// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { qrCodeLinkUrl } from 'lib/facts/links.js';

import type { QRCodeSignInNavigationProp } from './qr-code-sign-in-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type QRCodeScreenProps = {
  +navigation: QRCodeSignInNavigationProp<'QRCodeScreen'>,
  +route: NavigationRoute<'QRCodeScreen'>,
};

const qrCodeValue = qrCodeLinkUrl('random_aes256_key', 'device_ed25519_key');

// eslint-disable-next-line no-unused-vars
function QRCodeScreen(props: QRCodeScreenProps): React.Node {
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
