// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { FIDContext } from 'lib/components/fid-provider.react.js';

import type { ProfileNavigationProp } from './profile.react.js';
import Button from '../components/button.react.js';
import FarcastAccount from '../components/farcast-account.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: ProfileNavigationProp<'FarcasterAccountSettings'>,
  +route: NavigationRoute<'FarcasterAccountSettings'>,
};

function FarcasterAccountSettings(props: Props): React.Node {
  const { navigation } = props;

  const fidContext = React.useContext(FIDContext);
  invariant(fidContext, 'FIDContext is missing');

  const { fid, setFID } = fidContext;

  const styles = useStyles(unboundStyles);

  const onPressDisconnect = React.useCallback(() => {
    setFID(null);
  }, [setFID]);

  if (fid) {
    return (
      <View>
        <Text style={styles.header}>Disconnect from Farcaster</Text>
        <Text style={styles.body}>
          You can disconnect your Farcaster account at any time.
        </Text>
        <Button onPress={onPressDisconnect}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.connectContainer}>
      <FarcastAccount onSuccess={navigation.goBack} />
    </View>
  );
}

const unboundStyles = {
  connectContainer: {
    flex: 1,
    paddingBottom: 16,
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
};

export default FarcasterAccountSettings;
