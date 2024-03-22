// @flow

import * as React from 'react';
import { View } from 'react-native';

import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import FarcasterAccount from '../../components/farcaster-account.react.js';
import {
  type NavigationRoute,
  UsernameSelectionRouteName,
} from '../../navigation/route-names.js';

export type ConnectFarcasterParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverURL: string,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectFarcaster'>,
  +route: NavigationRoute<'ConnectFarcaster'>,
};

function ConnectFarcaster(prop: Props): React.Node {
  const { navigation, route } = prop;

  const { navigate } = navigation;
  const { params } = route;

  const goToNextStep = React.useCallback(() => {
    navigate<'UsernameSelection'>({
      name: UsernameSelectionRouteName,
      params,
    });
  }, [navigate, params]);

  return (
    <RegistrationContainer style={styles.registrationContainer}>
      <FarcasterAccount onSuccess={goToNextStep} />
      <View style={styles.secondaryButtonContainer}>
        <RegistrationButton
          onPress={goToNextStep}
          label="Do not connect"
          variant="outline"
        />
      </View>
    </RegistrationContainer>
  );
}

const styles = {
  registrationContainer: {
    // TODO: fix this hack
    paddingTop: 112,
  },
  secondaryButtonContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
};

export default ConnectFarcaster;
