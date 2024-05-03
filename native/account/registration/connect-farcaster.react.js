// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert } from 'react-native';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';

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
import { getFarcasterAccountAlreadyLinkedAlertDetails } from '../../utils/alert-messages.js';

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

  const { navigate } = navigation;
  const { params } = route;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

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

  const onSkip = React.useCallback(() => goToNextStep(), [goToNextStep]);

  const identityServiceClient = React.useContext(IdentityClientContext);
  const getFarcasterUsers =
    identityServiceClient?.identityClient.getFarcasterUsers;
  invariant(getFarcasterUsers, 'Could not get getFarcasterUsers');

  const [queuedAlert, setQueuedAlert] = React.useState<?{
    +title: string,
    +message: string,
  }>();

  const onSuccess = React.useCallback(
    async (fid: string) => {
      try {
        const commFCUsers = await getFarcasterUsers([fid]);
        if (commFCUsers.length > 0 && commFCUsers[0].farcasterID === fid) {
          const commUsername = commFCUsers[0].username;

          const { title, message } =
            getFarcasterAccountAlreadyLinkedAlertDetails(commUsername);

          setQueuedAlert({
            title,
            message,
          });
          setWebViewState('closed');
        } else {
          goToNextStep(fid);
          setCachedSelections(oldUserSelections => ({
            ...oldUserSelections,
            farcasterID: fid,
          }));
        }
      } catch (e) {
        setQueuedAlert({
          title: 'Failed to query Comm',
          message:
            'We failed to query Comm to see if that Farcaster account is ' +
            'already linked',
        });
        setWebViewState('closed');
      }
    },
    [goToNextStep, setCachedSelections, getFarcasterUsers],
  );

  const isAppForegrounded = useIsAppForegrounded();
  React.useEffect(() => {
    if (!queuedAlert || !isAppForegrounded) {
      return;
    }
    Alert.alert(queuedAlert.title, queuedAlert.message);
    setQueuedAlert(null);
  }, [queuedAlert, isAppForegrounded]);

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

  const alreadyConnectedButton = React.useMemo(() => {
    if (!alreadyHasConnected) {
      return null;
    }

    return (
      <RegistrationButton
        onPress={onUseAlreadyConnectedAccount}
        label="Use connected Farcaster account"
        variant="enabled"
      />
    );
  }, [alreadyHasConnected, onUseAlreadyConnectedAccount]);

  const connectFarcaster = React.useMemo(
    () => (
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
            onPress={onSkip}
            label="Do not connect"
            variant="outline"
          />
        </RegistrationButtonContainer>
      </RegistrationContainer>
    ),
    [
      alreadyConnectedButton,
      connectButtonText,
      connectButtonVariant,
      onPressConnectFarcaster,
      onSkip,
      onSuccess,
      webViewState,
    ],
  );

  return connectFarcaster;
}

const styles = {
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default ConnectFarcaster;
