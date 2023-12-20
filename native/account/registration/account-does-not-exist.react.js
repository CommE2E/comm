// @flow

import * as React from 'react';
import { Text } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  type NavigationRoute,
  CoolOrNerdModeSelectionRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +navigation: RegistrationNavigationProp<'AccountDoesNotExist'>,
  +route: NavigationRoute<'AccountDoesNotExist'>,
};
function AccountDoesNotExist(props: Props): React.Node {
  const { navigate } = props.navigation;
  const onSubmit = React.useCallback(() => {
    navigate(CoolOrNerdModeSelectionRouteName);
  }, [navigate]);

  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>New Comm account</Text>
        <Text style={styles.body}>
          It looks like this is your first time logging into Comm.
        </Text>
        <Text style={styles.body}>
          Let&rsquo;s get started with registering your Ethereum account!
        </Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton onPress={onSubmit} label="Next" variant="enabled" />
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
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
};

export default AccountDoesNotExist;
