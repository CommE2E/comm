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
import type { CoolOrNerdMode } from './registration-types.js';
import FarcasterPrompt from '../../components/farcaster-prompt.react.js';
import FarcasterWebView from '../../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../../components/farcaster-web-view.react.js';
import {
  type NavigationRoute,
  ConnectEthereumRouteName,
  AvatarSelectionRouteName,
} from '../../navigation/route-names.js';
import { useStaffCanSee } from '../../utils/staff-utils.js';

export type ConnectFarcasterParams = ?{
  +userSelections?: {
    +coolOrNerdMode?: CoolOrNerdMode,
    +keyserverURL?: string,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectFarcaster'>,
  +route: NavigationRoute<'ConnectFarcaster'>,
};

function ConnectFarcaster(prop: Props): React.Node {
  const { navigation, route } = prop;

  const { navigate } = navigation;
  const userSelections = route.params?.userSelections;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const {
    cachedSelections,
    setCachedSelections,
    skipEthereumLoginOnce,
    setSkipEthereumLoginOnce,
  } = registrationContext;

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const { ethereumAccount } = cachedSelections;
  const goToNextStep = React.useCallback(
    (fid?: ?string) => {
      setWebViewState('closed');

      if (!skipEthereumLoginOnce || !ethereumAccount) {
        navigate<'ConnectEthereum'>({
          name: ConnectEthereumRouteName,
          params: {
            userSelections: {
              ...userSelections,
              farcasterID: fid,
            },
          },
        });
        return;
      }

      const newUserSelections = {
        ...userSelections,
        farcasterID: fid,
        accountSelection: ethereumAccount,
      };
      setSkipEthereumLoginOnce(false);
      navigate<'AvatarSelection'>({
        name: AvatarSelectionRouteName,
        params: { userSelections: newUserSelections },
      });
    },
    [
      navigate,
      skipEthereumLoginOnce,
      setSkipEthereumLoginOnce,
      ethereumAccount,
      userSelections,
    ],
  );

  const onSkip = React.useCallback(() => goToNextStep(), [goToNextStep]);

  const identityServiceClient = React.useContext(IdentityClientContext);
  const getFarcasterUsers =
    identityServiceClient?.identityClient.getFarcasterUsers;
  invariant(getFarcasterUsers, 'Could not get getFarcasterUsers');

  const [queuedAlert, setQueuedAlert] = React.useState<?{
    +title: string,
    +body: string,
  }>();

  const onSuccess = React.useCallback(
    async (fid: string) => {
      try {
        const commFCUsers = await getFarcasterUsers([fid]);
        if (commFCUsers.length > 0 && commFCUsers[0].farcasterID === fid) {
          const commUsername = commFCUsers[0].username;
          setQueuedAlert({
            title: 'Farcaster account already linked',
            body: `That Farcaster account is already linked to ${commUsername}`,
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
          body:
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
    Alert.alert(queuedAlert.title, queuedAlert.body);
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

  const staffCanSee = useStaffCanSee();
  const skipButton = React.useMemo(() => {
    if (!staffCanSee) {
      return undefined;
    }
    return (
      <RegistrationButton
        onPress={onSkip}
        label="Do not connect"
        variant="outline"
      />
    );
  }, [staffCanSee, onSkip]);

  const farcasterPromptTextType = staffCanSee ? 'optional' : 'required';
  const connectFarcaster = React.useMemo(
    () => (
      <RegistrationContainer>
        <RegistrationContentContainer style={styles.scrollViewContentContainer}>
          <FarcasterPrompt textType={farcasterPromptTextType} />
        </RegistrationContentContainer>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
        <RegistrationButtonContainer>
          {alreadyConnectedButton}
          <RegistrationButton
            onPress={onPressConnectFarcaster}
            label={connectButtonText}
            variant={connectButtonVariant}
          />
          {skipButton}
        </RegistrationButtonContainer>
      </RegistrationContainer>
    ),
    [
      alreadyConnectedButton,
      connectButtonText,
      connectButtonVariant,
      onPressConnectFarcaster,
      onSuccess,
      webViewState,
      farcasterPromptTextType,
      skipButton,
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
