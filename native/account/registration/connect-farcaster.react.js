// @flow

import * as React from 'react';
import { View, Text, Linking } from 'react-native';
import WebView from 'react-native-webview';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  type NavigationRoute,
  UsernameSelectionRouteName,
} from '../../navigation/route-names.js';
import { defaultLandingURLPrefix } from '../../utils/url-utils.js';

type FarcasterWebViewMessage =
  | {
      +type: 'farcaster_url',
      +url: string,
    }
  | {
      +type: 'farcaster_data',
      +fid: string,
    };

type WebViewMessageEvent = {
  +nativeEvent: {
    +data: string,
    ...
  },
  ...
};

// might not need this but adding just in case
type WebViewState = 'closed' | 'opening' | 'open' | 'closing';

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectFarcaster'>,
  +route: NavigationRoute<'ConnectFarcaster'>,
};

const commConnectFarcasterURL = `${defaultLandingURLPrefix}/connect-farcaster`;

function ConnectFarcaster(prop: Props): React.Node {
  const { navigation, route } = prop;

  const { navigate } = navigation;
  const { params } = route;

  const [webViewState, setWebViewState] =
    React.useState<WebViewState>('closed');

  const [farcasterAccountFID, setFarcasterAccountFID] =
    React.useState<?string>(null);

  const onSkip = React.useCallback(() => {
    navigate<'UsernameSelection'>({
      name: UsernameSelectionRouteName,
      params,
    });
  }, [navigate, params]);

  const handleMessage = React.useCallback((event: WebViewMessageEvent) => {
    console.log('handing message from webview');
    const data: FarcasterWebViewMessage = JSON.parse(event.nativeEvent.data);

    if (data.type === 'farcaster_url') {
      console.log('url', data.url);
      void Linking.openURL(data.url);
    } else if (data.type === 'farcaster_data') {
      setFarcasterAccountFID(data.fid);
    }
  }, []);

  const webview = React.useMemo(() => {
    if (webViewState === 'closed') {
      return null;
    }

    return (
      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: commConnectFarcasterURL }}
          style={styles.webview}
          onMessage={handleMessage}
          incognito={true}
          originWhitelist={['*']}
        />
      </View>
    );
  }, [handleMessage, webViewState]);

  const farcasterAccountDetails = React.useMemo(() => {
    if (!farcasterAccountFID) {
      return null;
    }
    return (
      <View>
        <Text style={styles.text}>Farcaster fid: {farcasterAccountFID}</Text>
      </View>
    );
  }, [farcasterAccountFID]);

  const buttons = React.useMemo(() => {
    if (farcasterAccountFID) {
      return null;
    }

    return (
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={() => {
            setWebViewState('opening');
          }}
          label="Connect Farcaster account"
          variant="enabled"
        />
        <RegistrationButton
          onPress={onSkip}
          label="Do not connect"
          variant="outline"
        />
      </RegistrationButtonContainer>
    );
  }, [farcasterAccountFID, onSkip]);

  return (
    <>
      <RegistrationContainer>
        <RegistrationContentContainer>
          <Text style={styles.text}>Connect to Farcaster?</Text>
          {farcasterAccountDetails}
          {buttons}
        </RegistrationContentContainer>
      </RegistrationContainer>
      {webview}
    </>
  );
}

const styles = {
  webViewContainer: {
    height: 0,
    overflow: 'hidden',
  },
  webview: {
    height: 0,
  },
  text: {
    color: 'white',
  },
};

export default ConnectFarcaster;
