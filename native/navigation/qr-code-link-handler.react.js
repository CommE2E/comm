// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Linking } from 'react-native';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import { SecondaryDeviceQRCodeScannerRouteName } from './route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function QRCodeLinkHandler() {
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

    navigate(SecondaryDeviceQRCodeScannerRouteName);
  }, [currentLink, loggedIn, navigate]);
}

export default QRCodeLinkHandler;
