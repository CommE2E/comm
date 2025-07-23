// @flow

import * as React from 'react';
import { View, Linking } from 'react-native';
import WebView from 'react-native-webview';

import type { FarcasterWebViewMessage } from 'lib/types/farcaster-types.js';

import type { WebViewMessageEvent } from '../types/web-view-types.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';

const commConnectFarcasterURL = `https://comm.app/connect-farcaster`;

const webViewSource = { uri: commConnectFarcasterURL };

const webViewOriginWhitelist = ['*'];

export type FarcasterWebViewState = 'closed' | 'opening';

type Props = {
  +onSuccess: (fid: string) => mixed,
  +webViewState: FarcasterWebViewState,
};

function FarcasterWebView(props: Props): React.Node {
  const { onSuccess, webViewState } = props;

  const handleMessage = React.useCallback(
    (event: WebViewMessageEvent) => {
      const data: FarcasterWebViewMessage = JSON.parse(event.nativeEvent.data);

      if (data.type === 'farcaster_url') {
        void Linking.openURL(data.url);
      } else if (data.type === 'farcaster_data') {
        onSuccess(data.fid);
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
          source={webViewSource}
          onMessage={handleMessage}
          incognito={true}
          originWhitelist={webViewOriginWhitelist}
        />
      </View>
    );
  }, [handleMessage, webViewState]);

  return webView;
}

const styles = {
  webViewContainer: {
    height: 0,
    overflow: 'hidden',
  },
  connectButtonContainer: {
    marginHorizontal: 16,
  },
};

export default FarcasterWebView;
