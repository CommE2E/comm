// @flow

import invariant from 'invariant';
import * as React from 'react';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type {
  CoolOrNerdMode,
  EthereumAccountSelection,
} from './registration-types.js';
import FarcasterPrompt from '../../components/farcaster-prompt.react.js';
import FarcasterWebView from '../../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../../components/farcaster-web-view.react.js';
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
  const { cachedSelections, setCachedSelections } = registrationContext;

  const { navigate } = navigation;
  const { params } = route;

  const goToNextStep = React.useCallback(
    (fid?: ?string) => {
      setWebViewState('closed');
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

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

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

  const { farcasterID } = cachedSelections;
  const alreadyHasConnected = !!farcasterID;

  const onPressConnectFarcaster = React.useCallback(() => {
    setWebViewState('opening');
  }, []);

  const defaultConnectButtonVariant = alreadyHasConnected
    ? 'outline'
    : 'enabled';
  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : defaultConnectButtonVariant;
  const connectButtonText = alreadyHasConnected
    ? 'Connect new Farcaster account'
    : 'Connect Farcaster account';

  const onUseAlreadyConnectedAccount = React.useCallback(() => {
    invariant(
      farcasterID,
      'farcasterID should be set in onUseAlreadyConnectedAccount',
    );
    goToNextStep(farcasterID);
  }, [farcasterID, goToNextStep]);

  let alreadyConnectedButton;
  if (alreadyHasConnected) {
    alreadyConnectedButton = (
      <RegistrationButton
        onPress={onUseAlreadyConnectedAccount}
        label="Use connected Farcaster account"
        variant="enabled"
      />
    );
  }

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <FarcasterPrompt />
      </RegistrationContentContainer>
      <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
      <RegistrationButtonContainer>
        {alreadyConnectedButton}
        <RegistrationButton
          onPress={onPressConnectFarcaster}
          label={connectButtonText}
          variant={connectButtonVariant}
        />
        <RegistrationButton
          onPress={goToNextStep}
          label="Do not connect"
          variant="outline"
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
  );
}

const styles = {
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default ConnectFarcaster;
