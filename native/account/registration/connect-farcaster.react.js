// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';

import { siweNonceExpired } from './ethereum-utils.js';
import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import FarcasterPrompt from '../../components/farcaster-prompt.react.js';
import FarcasterWebView from '../../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../../components/farcaster-web-view.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import {
  type NavigationRoute,
  ConnectEthereumRouteName,
  AvatarSelectionRouteName,
} from '../../navigation/route-names.js';
import {
  getFarcasterAccountAlreadyLinkedAlertDetails,
  type AlertDetails,
} from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';

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
      invariant(
        !ethereumAccount || ethereumAccount.nonceTimestamp,
        'nonceTimestamp must be set after connecting to Ethereum account',
      );
      const nonceExpired =
        ethereumAccount &&
        ethereumAccount.nonceTimestamp &&
        siweNonceExpired(ethereumAccount.nonceTimestamp);
      if (nonceExpired) {
        setCachedSelections(oldUserSelections => ({
          ...oldUserSelections,
          ethereumAccount: undefined,
        }));
      }

      if (!skipEthereumLoginOnce || !ethereumAccount || nonceExpired) {
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
      setCachedSelections,
    ],
  );

  const onSkip = React.useCallback(() => goToNextStep(), [goToNextStep]);

  const identityServiceClient = React.useContext(IdentityClientContext);
  const getFarcasterUsers =
    identityServiceClient?.identityClient.getFarcasterUsers;
  invariant(getFarcasterUsers, 'Could not get getFarcasterUsers');

  const [queuedAlert, setQueuedAlert] = React.useState<?AlertDetails>();

  const onSuccess = React.useCallback(
    async (fid: string) => {
      try {
        const commFCUsers = await getFarcasterUsers([fid]);
        if (commFCUsers.length > 0 && commFCUsers[0].farcasterID === fid) {
          const commUsername = commFCUsers[0].username;

          const alert =
            getFarcasterAccountAlreadyLinkedAlertDetails(commUsername);

          setQueuedAlert(alert);
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
      <PrimaryButton
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
          <FarcasterPrompt textType="connect" />
        </RegistrationContentContainer>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
        <RegistrationButtonContainer>
          {alreadyConnectedButton}
          <PrimaryButton
            onPress={onPressConnectFarcaster}
            label={connectButtonText}
            variant={connectButtonVariant}
          />
          <PrimaryButton
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
      onSuccess,
      webViewState,
      onSkip,
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
