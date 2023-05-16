// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import EthereumLogoDark from '../../vectors/ethereum-logo-dark.react.js';
import SIWEPanel from '../siwe-panel.react.js';

export type ConnectEthereumParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
  },
};

type PanelState = 'closed' | 'opening' | 'open' | 'closing';

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectEthereum'>,
  +route: NavigationRoute<'ConnectEthereum'>,
};
function ConnectEthereum(props: Props): React.Node {
  const isNerdMode =
    props.route.params.userSelections.coolOrNerdMode === 'nerd';
  const styles = useStyles(unboundStyles);

  let body;
  if (!isNerdMode) {
    body = (
      <Text style={styles.body}>
        Connecting your Ethereum wallet allows you to use your ENS name and
        avatar in the app. You&apos;ll also be able to log in with your wallet
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
              You&apos;ll be able to use your ENS name and avatar in the app.
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

  const [panelState, setPanelState] = React.useState<PanelState>('closed');
  const openPanel = React.useCallback(() => {
    setPanelState('opening');
  }, []);
  const onPanelClosed = React.useCallback(() => {
    setPanelState('closed');
  }, []);
  const onPanelClosing = React.useCallback(() => {
    setPanelState('closing');
  }, []);

  const siwePanelSetLoading = React.useCallback(
    (loading: boolean) => {
      if (panelState === 'closing' || panelState === 'closed') {
        return;
      }
      setPanelState(loading ? 'opening' : 'open');
    },
    [panelState],
  );

  let siwePanel;
  if (panelState !== 'closed') {
    siwePanel = (
      <SIWEPanel
        onClosing={onPanelClosing}
        onClosed={onPanelClosed}
        closing={panelState === 'closing'}
        setLoading={siwePanelSetLoading}
      />
    );
  }

  const onSkip = React.useCallback(() => {}, []);

  return (
    <View style={styles.container}>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>
          Do you want to connect an Ethereum Wallet to your account?
        </Text>
        {body}
        <View style={styles.ethereumLogoContainer}>
          <EthereumLogoDark />
        </View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={openPanel}
          label="Connect Ethereum wallet"
          variant={panelState === 'opening' ? 'loading' : 'enabled'}
        />
        <RegistrationButton
          onPress={onSkip}
          label="Do not connect"
          variant="outline"
        />
      </RegistrationButtonContainer>
      {siwePanel}
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
    flex: 1,
  },
  scrollViewContentContainer: {
    flexGrow: 1,
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
