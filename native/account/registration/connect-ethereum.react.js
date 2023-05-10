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
function ConnectEthereum(props: Props): React.Node {
  const onConnect = React.useCallback(() => {}, []);
  const onSkip = React.useCallback(() => {}, []);

  const isNerdMode =
    props.route.params.userSelections.coolOrNerdMode === 'nerd';
  const styles = useStyles(unboundStyles);

  let body;
  if (!isNerdMode) {
    body = (
      <Text style={styles.body}>
        Connecting your Ethereum wallet allows you to use your ENS name and
        avatar on the app. You&apos;ll also be able to log in with your wallet
        instead of a password.
      </Text>
    );
  } else {
    body = (
      <>
        <Text style={styles.body}>
          Connecting your Ethereum wallet has three benefits:
        </Text>
        <View style={styles.list}>
          <View style={styles.listItem}>
            <Text style={styles.listItemNumber}>{'1. '}</Text>
            <Text style={styles.listItemContent}>
              Your peers will be able to cryptographically verify that your Comm
              account is associated with your Ethereum wallet.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listItemNumber}>{'2. '}</Text>
            <Text style={styles.listItemContent}>
              You&apos;ll be able to use your ENS name and avatar on the app.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listItemNumber}>{'3. '}</Text>
            <Text style={styles.listItemContent}>
              You can choose to skip setting a password, and to log in with your
              Ethereum wallet instead.
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <RegistrationContainer>
        <Text style={styles.header}>
          Do you want to connect an Ethereum Wallet to your account?
        </Text>
        {body}
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
  list: {
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
  },
  listItemNumber: {
    fontWeight: 'bold',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
  },
  listItemContent: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
  },
};

export default ConnectEthereum;
