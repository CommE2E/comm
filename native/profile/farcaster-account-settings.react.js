// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { FIDContext } from 'lib/components/fid-provider.react.js';

import type { ProfileNavigationProp } from './profile.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import FarcasterAccount from '../components/farcaster-account.react.js';
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

  const onSuccess = React.useCallback(() => {
    goBack();
  }, [goBack]);

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
      <FarcasterAccount onSuccess={onSuccess} />
    </View>
  );
}

const unboundStyles = {
  connectContainer: {
    flex: 1,
    paddingBottom: 16,
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
