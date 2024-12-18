// @flow

import * as React from 'react';
import { Text, View, Image } from 'react-native';

import AuthButtonContainer from './registration-button-container.react.js';
import AuthContainer from './registration-container.react.js';
import AuthContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import commSwooshSource from '../../img/comm-swoosh.png';
import {
  type NavigationRoute,
  ConnectFarcasterRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +navigation: RegistrationNavigationProp<'AccountDoesNotExist'>,
  +route: NavigationRoute<'AccountDoesNotExist'>,
};
function AccountDoesNotExist(props: Props): React.Node {
  const { navigate } = props.navigation;
  const onSubmit = React.useCallback(() => {
    navigate(ConnectFarcasterRouteName);
  }, [navigate]);

  const styles = useStyles(unboundStyles);
  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>New Comm account</Text>
        <Text style={styles.body}>
          It looks like this is your first time logging into Comm.
        </Text>
        <Text style={styles.body}>
          Let&rsquo;s get started with registering your Ethereum account!
        </Text>
        <View style={styles.commSwooshContainer}>
          <Image source={commSwooshSource} style={styles.commSwoosh} />
        </View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton onPress={onSubmit} label="Next" variant="enabled" />
      </AuthButtonContainer>
    </AuthContainer>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    flexGrow: 1,
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
  commSwooshContainer: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commSwoosh: {
    resizeMode: 'center',
    width: '100%',
    height: '100%',
  },
};

export default AccountDoesNotExist;
