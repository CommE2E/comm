// @flow

import * as React from 'react';
import { View, Linking } from 'react-native';
import WebView from 'react-native-webview';

import RegistrationButtonContainer from '../account/registration/registration-button-container.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';

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

type WebViewState = 'closed' | 'opening';

const commConnectFarcasterURL = `${defaultLandingURLPrefix}/connect-farcaster`;

type Props = {
  +onSuccess: (fid: string) => mixed,
  +children: React.Node,
};

function FarcasterAccount(props: Props): React.Node {
  const { onSuccess, children } = props;

  const [webViewState, setWebViewState] =
    React.useState<WebViewState>('closed');

  const onPressConnectFarcaster = React.useCallback(() => {
    setWebViewState('opening');
  }, []);

  const handleMessage = React.useCallback(
    (event: WebViewMessageEvent) => {
      const data: FarcasterWebViewMessage = JSON.parse(event.nativeEvent.data);

      if (data.type === 'farcaster_url') {
        void Linking.openURL(data.url);
      } else if (data.type === 'farcaster_data') {
        onSuccess(data.fid.toString());
        setWebViewState('closed');
      }
    },
    [onSuccess],
  );

  const webView = React.useMemo(() => {
    if (webViewState === 'closed') {
      return null;
    }

    return (
      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: commConnectFarcasterURL }}
          style={styles.webView}
          onMessage={handleMessage}
          incognito={true}
          originWhitelist={['*']}
        />
      </View>
    );
  }, [handleMessage, webViewState]);

  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : 'enabled';

  return (
    <>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onPressConnectFarcaster}
          label="Connect Farcaster account"
          variant={connectButtonVariant}
        />
        {children}
      </RegistrationButtonContainer>
      {webView}
    </>
  );
}

const styles = {
  webViewContainer: {
    height: 0,
    overflow: 'hidden',
  },
  webView: {
    height: 0,
  },
  connectButtonContainer: {
    marginHorizontal: 16,
  },
};

export default FarcasterAccount;
