// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Linking } from 'react-native';

import { parseKeysFromQRCodeURL } from 'lib/facts/links.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import { SecondaryDeviceQRCodeScannerRouteName } from './route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function QRCodeLinkHandler(): null {
  const [currentLink, setCurrentLink] = React.useState(null);

  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) =>
      setCurrentLink(url),
    );
    (async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        setCurrentLink(initialURL);
      }
    })();

    return () => subscription.remove();
  }, []);

  const loggedIn = useSelector(isLoggedIn);
  const { navigate } = useNavigation();

  React.useEffect(() => {
    if (!loggedIn || !currentLink) {
      return;
    }

    setCurrentLink(null);

    const keys = parseKeysFromQRCodeURL(currentLink);
    if (!keys) {
      return;
    }

    navigate(SecondaryDeviceQRCodeScannerRouteName);
  }, [currentLink, loggedIn, navigate]);

  return null;
}

export default QRCodeLinkHandler;
