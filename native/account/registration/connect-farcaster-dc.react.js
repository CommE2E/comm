// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import { siweNonceExpired } from './ethereum-utils.js';
import { RegistrationContext } from './registration-context.js';
import RegistrationTextInput from './registration-text-input.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import FarcasterPrompt from '../../components/farcaster-prompt.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import { FarcasterAuthContextProvider } from '../../farcaster-auth/farcaster-auth-context-provider.react.js';
import { useGetAuthToken } from '../../farcaster-auth/farcaster-auth-utils.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import {
  AvatarSelectionRouteName,
  ConnectEthereumRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

export type ConnectFarcasterDCsParams = {
  +userSelections: {
    +coolOrNerdMode?: ?CoolOrNerdMode,
    +keyserverURL?: ?string,
    +farcasterID: string,
    +farcasterAvatarURL: ?string,
  },
};

type Props = {
  +navigation: AuthNavigationProp<'ConnectFarcasterDCs'>,
  +route: NavigationRoute<'ConnectFarcasterDCs'>,
};

function InnerConnectFarcasterDCs(props: Props): React.Node {
  const { navigation, route } = props;

  const { navigate } = navigation;
  const userSelections = route.params?.userSelections;

  const [mnemonic, setMnemonic] = React.useState<?string>(null);

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const {
    cachedSelections,
    setCachedSelections,
    skipEthereumLoginOnce,
    setSkipEthereumLoginOnce,
  } = registrationContext;

  const { ethereumAccount } = cachedSelections;
  const goToNextStep = React.useCallback(
    (farcasterDCsToken?: ?string) => {
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
              farcasterDCsToken,
            },
          },
        });
        return;
      }

      const newUserSelections = {
        ...userSelections,
        accountSelection: ethereumAccount,
        farcasterDCsToken,
      };
      setSkipEthereumLoginOnce(false);
      navigate<'AvatarSelection'>({
        name: AvatarSelectionRouteName,
        params: { userSelections: newUserSelections },
      });
    },
    [
      ethereumAccount,
      navigate,
      setCachedSelections,
      setSkipEthereumLoginOnce,
      skipEthereumLoginOnce,
      userSelections,
    ],
  );

  const onSkip = React.useCallback(() => {
    if (cachedSelections.farcasterDCsToken) {
      setCachedSelections(({ farcasterDCsToken, ...rest }) => rest);
    }
    goToNextStep();
  }, [cachedSelections.farcasterDCsToken, goToNextStep, setCachedSelections]);

  const getAuthToken = useGetAuthToken();
  const [signingInProgress, setSigningInProgress] = React.useState(false);
  const onConnect = React.useCallback(async () => {
    if (!mnemonic) {
      goToNextStep();
      return;
    }

    setSigningInProgress(true);
    try {
      const token = await getAuthToken(userSelections.farcasterID, mnemonic);
      setCachedSelections(oldUserSelections => ({
        farcasterDCsToken: token,
        ...oldUserSelections,
      }));
      goToNextStep(token);
    } catch (e) {
      Alert.alert(
        'Failed to connect',
        'Failed to connect to Farcaster Direct Casts. Please try again later.',
      );
    }
    setSigningInProgress(false);
  }, [
    getAuthToken,
    goToNextStep,
    mnemonic,
    setCachedSelections,
    userSelections.farcasterID,
  ]);

  let buttonVariant = 'enabled';
  if (!mnemonic || cachedSelections.farcasterDCsToken) {
    buttonVariant = 'disabled';
  } else if (signingInProgress) {
    buttonVariant = 'loading';
  }

  const onUseAlreadyConnectedAccount = React.useCallback(() => {
    goToNextStep(cachedSelections.farcasterDCsToken);
  }, [cachedSelections.farcasterDCsToken, goToNextStep]);
  const alreadyConnected = !!cachedSelections.farcasterDCsToken;
  let alreadyConnectedButton = null;
  if (alreadyConnected) {
    alreadyConnectedButton = (
      <PrimaryButton
        onPress={onUseAlreadyConnectedAccount}
        label="Use connected account"
        variant="enabled"
      />
    );
  }

  const onChangeText = React.useCallback(
    (text: string) => {
      setMnemonic(text);
      setCachedSelections(({ farcasterDCsToken, ...rest }) => rest);
    },
    [setCachedSelections],
  );

  const styles = useStyles(unboundStyles);
  return React.useMemo(
    () => (
      <AuthContainer>
        <AuthContentContainer style={styles.scrollViewContentContainer}>
          <FarcasterPrompt textType="connect_DC" />
          <Text style={styles.description}>
            To connect your Farcaster Direct Casts, open your Farcaster app, go
            to Settings → Advanced → Show Farcaster recovery phase, and copy
            your 24-word mnemonic phrase. Paste it into the text field below.
          </Text>
          <Text style={styles.description}>
            We’ll use this to sign a message with Farcaster and receive your
            access token. Your mnemonic phrase is only used locally for signing
            and is not stored on our servers.
          </Text>
          <RegistrationTextInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            editable={!signingInProgress}
            keyboardType="default"
            onChangeText={onChangeText}
            onSubmitEditing={onConnect}
            placeholder="Wellet mnemonic"
            returnKeyType="go"
            secureTextEntry={true}
            value={mnemonic}
          />
        </AuthContentContainer>
        <AuthButtonContainer>
          {alreadyConnectedButton}
          <PrimaryButton
            onPress={onConnect}
            label="Connect Direct Casts"
            variant={buttonVariant}
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
      buttonVariant,
      mnemonic,
      onChangeText,
      onConnect,
      onSkip,
      signingInProgress,
      styles.description,
      styles.scrollViewContentContainer,
    ],
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    flexGrow: 1,
  },
  description: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
};

function ConnectFarcasterDCs(props: Props): React.Node {
  return (
    <FarcasterAuthContextProvider>
      <InnerConnectFarcasterDCs {...props} />
    </FarcasterAuthContextProvider>
  );
}

export { ConnectFarcasterDCs };
