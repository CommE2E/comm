// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, Linking } from 'react-native';
import WebView from 'react-native-webview';

import { FIDContext } from 'lib/components/fid-provider.react.js';

import RegistrationButton from '../account/registration/registration-button.react.js';
import { useStyles } from '../themes/colors.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

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
  +onSuccess: () => mixed,
};

function FarcastAccount(props: Props): React.Node {
  const { onSuccess } = props;

  const setFID = React.useContext(FIDContext)?.setFID;
  invariant(setFID, 'FIDContext is missing');

  const styles = useStyles(unboundStyles);

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
        setFID(data.fid.toString());
        onSuccess();
      }
    },
    [onSuccess, setFID],
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
  }, [handleMessage, webViewState, styles.webViewContainer, styles.webView]);

  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : 'enabled';

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.header}>
          Do you want to connect your Farcaster account?
        </Text>
        <Text style={styles.body}>
          Connecting your Farcaster account lets you see your mutual follows on
          Comm. We&rsquo;ll also surface communities based on your Farcaster
          channels.
        </Text>
        <View style={styles.farcasterLogoContainer}>
          <FarcasterLogo />
        </View>
        {webView}
      </View>
      <View style={styles.connectButtonContainer}>
        <RegistrationButton
          onPress={onPressConnectFarcaster}
          label="Connect Farcaster account"
          variant={connectButtonVariant}
        />
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  farcasterLogoContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

export default FarcastAccount;
