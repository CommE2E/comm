// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { FIDContext } from 'lib/components/fid-provider.react.js';

import type { ProfileNavigationProp } from './profile.react.js';
import RegistrationButtonContainer from '../account/registration/registration-button-container.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import FarcasterPrompt from '../components/farcaster-prompt.react.js';
import FarcasterWebView from '../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../components/farcaster-web-view.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type Props = {
  +navigation: ProfileNavigationProp<'FarcasterAccountSettings'>,
  +route: NavigationRoute<'FarcasterAccountSettings'>,
};

function FarcasterAccountSettings(props: Props): React.Node {
  const { navigation } = props;
  const { goBack } = navigation;

  const fidContext = React.useContext(FIDContext);
  invariant(fidContext, 'FIDContext is missing');

  const { fid, setFID } = fidContext;

  const styles = useStyles(unboundStyles);

  const onPressDisconnect = React.useCallback(() => {
    setFID(null);
    goBack();
  }, [goBack, setFID]);

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const onSuccess = React.useCallback(
    (newFID: string) => {
      setWebViewState('closed');
      setFID(newFID);
      goBack();
    },
    [setFID, goBack],
  );

  const onPressConnectFarcaster = React.useCallback(() => {
    setWebViewState('opening');
  }, []);

  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : 'enabled';

  if (fid) {
    return (
      <View style={styles.disconnectContainer}>
        <View>
          <Text style={styles.header}>Disconnect from Farcaster</Text>
          <Text style={styles.body}>
            You can disconnect your Farcaster account at any time.
          </Text>
          <View style={styles.farcasterLogoContainer}>
            <FarcasterLogo />
          </View>
        </View>
        <RegistrationButton
          onPress={onPressDisconnect}
          label="Disconnect"
          variant="outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.connectContainer}>
      <View style={styles.container}>
        <FarcasterPrompt />
      </View>
      <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onPressConnectFarcaster}
          label="Connect Farcaster account"
          variant={connectButtonVariant}
        />
      </RegistrationButtonContainer>
    </View>
  );
}

const unboundStyles = {
  connectContainer: {
    flex: 1,
    backgroundColor: 'panelBackground',
    paddingBottom: 16,
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  disconnectContainer: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
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
  buttonText: {
    fontSize: 18,
    color: 'panelForegroundLabel',
    textAlign: 'center',
    padding: 12,
  },
  farcasterLogoContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default FarcasterAccountSettings;
