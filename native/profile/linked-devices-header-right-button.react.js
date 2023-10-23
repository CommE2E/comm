// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import HeaderRightAddButton from '../navigation/header-right-add-button.react.js';
import { SecondaryDeviceQRCodeScannerRouteName } from '../navigation/route-names.js';
import Alert from '../utils/alert.js';
import { deviceIsEmulator } from '../utils/url-utils.js';

function LinkedDevicesHeaderRightButton(): React.Node {
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

  return <HeaderRightAddButton onPress={navigateToQRCodeScanner} />;
}

export default LinkedDevicesHeaderRightButton;
