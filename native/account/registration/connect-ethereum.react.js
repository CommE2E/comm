// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import EthereumLogoDark from '../../vectors/ethereum-logo-dark.react.js';

export type ConnectEthereumParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectEthereum'>,
  +route: NavigationRoute<'ConnectEthereum'>,
};
// eslint-disable-next-line no-unused-vars
function ConnectEthereum(props: Props): React.Node {
  const onConnect = React.useCallback(() => {}, []);
  const onSkip = React.useCallback(() => {}, []);

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.container}>
      <RegistrationContainer>
        <Text style={styles.header}>
          Do you want to connect an Ethereum Wallet to your account?
        </Text>
        <Text style={styles.body}>
          Connecting your Ethereum wallet allows you to cryptographically prove
          your identity to your peers. You can use your ENS name as your
          username and your ENS avatar as your avatar. You&apos;ll also be able
          to secure your account with a wallet signature instead of a password.
        </Text>
        <View style={styles.ethereumLogoContainer}>
          <EthereumLogoDark />
        </View>
      </RegistrationContainer>
      <RegistrationButton
        onPress={onConnect}
        label="Connect Ethereum wallet"
        variant="enabled"
      />
      <RegistrationButton
        onPress={onSkip}
        label="Do not connect"
        variant="enabled"
      />
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
    flex: 1,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  ethereumLogoContainer: {
    alignItems: 'center',
  },
};

export default ConnectEthereum;
