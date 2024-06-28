// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import { SecondaryDeviceQRCodeScannerRouteName } from '../navigation/route-names.js';

function LinkedDevicesHeaderRightButton(): React.Node {
  const { navigate } = useNavigation();

  const navigateToQRCodeScanner = React.useCallback(() => {
    navigate(SecondaryDeviceQRCodeScannerRouteName);
  }, [navigate]);

  return (
    <HeaderRightTextButton label="Add" onPress={navigateToQRCodeScanner} />
  );
}

export default LinkedDevicesHeaderRightButton;
