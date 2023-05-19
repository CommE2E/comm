// @flow

import * as React from 'react';
import { Text } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type ExistingEthereumAccountParams = {
  +message: string,
  +signature: string,
};

type Props = {
  +navigation: RegistrationNavigationProp<'ExistingEthereumAccount'>,
  +route: NavigationRoute<'ExistingEthereumAccount'>,
};
function ExistingEthereumAccount(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const { goBack } = props.navigation;

  const onProceedToLogIn = React.useCallback(() => {}, []);

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>
          Account already exists for Ethereum wallet
        </Text>
        <Text style={styles.body}>
          You can proceed to log in with this wallet, or go back and use a
          different wallet.
        </Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceedToLogIn}
          label="Log in to account"
          variant="enabled"
        />
        <RegistrationButton
          onPress={goBack}
          label="Use a different wallet"
          variant="outline"
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
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
};

export default ExistingEthereumAccount;
