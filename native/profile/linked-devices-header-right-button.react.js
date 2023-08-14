// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { SecondaryDeviceQRCodeScannerRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import { deviceIsEmulator } from '../utils/url-utils.js';

function LinkedDevicesHeaderRightButton(): React.Node {
  const styles = useStyles(unboundStyles);
  const { navigate } = useNavigation();

  const navigateToQRCodeScanner = React.useCallback(() => {
    if (deviceIsEmulator) {
      Alert.alert(
        'Unsupported device',
        "You can't access the QR code scanner on a simulator.",
        [{ text: 'OK' }],
        { cancelable: false },
      );
      return;
    }
    navigate(SecondaryDeviceQRCodeScannerRouteName);
  }, [navigate]);

  return (
    <TouchableOpacity onPress={navigateToQRCodeScanner}>
      <Text style={styles.textStyle}>Add</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  textStyle: {
    color: 'headerChevron',
    fontSize: 16,
    marginRight: 10,
  },
};

export default LinkedDevicesHeaderRightButton;
