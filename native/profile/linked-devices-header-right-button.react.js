// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import { QRAuthNavigatorRouteName } from '../navigation/route-names.js';

function LinkedDevicesHeaderRightButton(): React.Node {
  const { navigate } = useNavigation();

  const navigateToQRCodeScanner = React.useCallback(() => {
    navigate(QRAuthNavigatorRouteName);
  }, [navigate]);

  return (
    <HeaderRightTextButton label="Add" onPress={navigateToQRCodeScanner} />
  );
}

export default LinkedDevicesHeaderRightButton;
