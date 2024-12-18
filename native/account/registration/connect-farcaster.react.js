// @flow

import invariant from 'invariant';
import * as React from 'react';

import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';
import type { BaseFCAvatarInfo } from 'lib/utils/farcaster-helpers.js';

import { siweNonceExpired } from './ethereum-utils.js';
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
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

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
    (fid?: ?string, farcasterAvatarURL: ?string) => {
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
              farcasterAvatarURL: farcasterAvatarURL,
            },
          },
        });
        return;
      }

      const newUserSelections = {
        ...userSelections,
        farcasterID: fid,
        accountSelection: ethereumAccount,
        farcasterAvatarURL: farcasterAvatarURL,
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

  const neynarClient = React.useContext(NeynarClientContext);

  const [queuedAlert, setQueuedAlert] = React.useState<?AlertDetails>();

  const onSuccess = React.useCallback(
    async (fid: string) => {
      // We use this fallback function to proceed without the `neynarClient`
      // if it's missing (devs might be missing the relevant config)
      const fallbackGetFCAvatarURLs = (
        // eslint-disable-next-line no-unused-vars
        fids: $ReadOnlyArray<string>,
      ): Promise<BaseFCAvatarInfo[]> => Promise.resolve([]);
      const getFCAvatarURLs =
        neynarClient?.getFCAvatarURLs ?? fallbackGetFCAvatarURLs;

      try {
        const [commFCUsers, farcasterAvatarURLs] = await Promise.all([
          getFarcasterUsers([fid]),
          getFCAvatarURLs([fid]),
        ]);
        if (commFCUsers.length > 0 && commFCUsers[0].farcasterID === fid) {
          const commUsername = commFCUsers[0].username;

          const alert =
            getFarcasterAccountAlreadyLinkedAlertDetails(commUsername);

          setQueuedAlert(alert);
          setWebViewState('closed');
        } else {
          const farcasterAvatarURL =
            farcasterAvatarURLs.length > 0 && farcasterAvatarURLs[0].pfpURL
              ? farcasterAvatarURLs[0].pfpURL
              : null;
          goToNextStep(fid, farcasterAvatarURL);
          setCachedSelections(oldUserSelections => ({
            ...oldUserSelections,
            farcasterID: fid,
            farcasterAvatarURL: farcasterAvatarURL ?? null,
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
    [
      neynarClient?.getFCAvatarURLs,
      getFarcasterUsers,
      goToNextStep,
      setCachedSelections,
    ],
  );

  const isAppForegrounded = useIsAppForegrounded();
  React.useEffect(() => {
    if (!queuedAlert || !isAppForegrounded) {
      return;
    }
    Alert.alert(queuedAlert.title, queuedAlert.message);
    setQueuedAlert(null);
  }, [queuedAlert, isAppForegrounded]);

  const { farcasterID, farcasterAvatarURL } = cachedSelections;
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
    goToNextStep(farcasterID, farcasterAvatarURL);
  }, [farcasterAvatarURL, farcasterID, goToNextStep]);

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
      <AuthContainer>
        <AuthContentContainer style={styles.scrollViewContentContainer}>
          <FarcasterPrompt textType="connect" />
        </AuthContentContainer>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
        <AuthButtonContainer>
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
        </AuthButtonContainer>
      </AuthContainer>
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
