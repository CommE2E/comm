// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type {
  CoolOrNerdMode,
  EthereumAccountSelection,
} from './registration-types.js';
import FarcasterAccount from '../../components/farcaster-account.react.js';
import {
  type NavigationRoute,
  UsernameSelectionRouteName,
  AvatarSelectionRouteName,
} from '../../navigation/route-names.js';

export type ConnectFarcasterParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverURL: string,
    +ethereumAccount?: EthereumAccountSelection,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectFarcaster'>,
  +route: NavigationRoute<'ConnectFarcaster'>,
};

function ConnectFarcaster(prop: Props): React.Node {
  const { navigation, route } = prop;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { setCachedSelections } = registrationContext;

  const { navigate } = navigation;
  const { params } = route;

  const goToNextStep = React.useCallback(
    (fid?: ?string) => {
      const { ethereumAccount, ...restUserSelections } = params.userSelections;
      if (ethereumAccount) {
        navigate<'AvatarSelection'>({
          name: AvatarSelectionRouteName,
          params: {
            ...params,
            userSelections: {
              ...restUserSelections,
              accountSelection: ethereumAccount,
              farcasterID: fid,
            },
          },
        });
      } else {
        navigate<'UsernameSelection'>({
          name: UsernameSelectionRouteName,
          params: {
            ...params,
            userSelections: {
              ...restUserSelections,
              farcasterID: fid,
            },
          },
        });
      }
    },
    [navigate, params],
  );

  const onSuccess = React.useCallback(
    (fid: string) => {
      goToNextStep(fid);
      setCachedSelections(oldUserSelections => ({
        ...oldUserSelections,
        farcasterID: fid,
      }));
    },
    [goToNextStep, setCachedSelections],
  );

  return (
    <RegistrationContainer style={styles.registrationContainer}>
      <FarcasterAccount onSuccess={onSuccess} />
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
