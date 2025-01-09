// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import {
  exactSearchUser,
  exactSearchUserActionTypes,
} from 'lib/actions/user-actions.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import {
  useGetEthereumAccountFromSIWEResult,
  siweNonceExpired,
} from './ethereum-utils.js';
import { RegistrationContext } from './registration-context.js';
import type { CoolOrNerdMode } from './registration-types.js';
import PrimaryButton from '../../components/primary-button.react.js';
import { commRustModule } from '../../native-modules.js';
import {
  type NavigationRoute,
  ExistingEthereumAccountRouteName,
  UsernameSelectionRouteName,
  AvatarSelectionRouteName,
} from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import { defaultURLPrefix } from '../../utils/url-utils.js';
import EthereumLogoDark from '../../vectors/ethereum-logo-dark.react.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';
import { useSIWEPanelState } from '../siwe-hooks.js';
import SIWEPanel from '../siwe-panel.react.js';

const exactSearchUserLoadingStatusSelector = createLoadingStatusSelector(
  exactSearchUserActionTypes,
);

const siweSignatureRequestData = {
  messageType: SIWEMessageTypes.MSG_AUTH,
};

export type ConnectEthereumParams = {
  +userSelections: {
    +coolOrNerdMode?: ?CoolOrNerdMode,
    +keyserverURL?: ?string,
    +farcasterID: ?string,
    +farcasterAvatarURL: ?string,
  },
};

type Props = {
  +navigation: AuthNavigationProp<'ConnectEthereum'>,
  +route: NavigationRoute<'ConnectEthereum'>,
};
function ConnectEthereum(props: Props): React.Node {
  const { params } = props.route;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const userSelections = params?.userSelections;
  const isNerdMode = userSelections?.coolOrNerdMode === 'nerd';
  const styles = useStyles(unboundStyles);

  let body;
  if (!isNerdMode) {
    body = (
      <Text style={styles.body}>
        Connecting your Ethereum wallet allows you to use your ENS name and
        avatar in the app. You&rsquo;ll also be able to log in with your wallet
        instead of a password.
      </Text>
    );
  } else {
    body = (
      <>
        <Text style={styles.body}>
          Connecting your Ethereum wallet has three benefits:
        </Text>
        <View style={styles.list}>
          <View style={styles.listItem}>
            <Text style={styles.listItemNumber}>{'1. '}</Text>
            <Text style={styles.listItemContent}>
              Your peers will be able to cryptographically verify that your Comm
              account is associated with your Ethereum wallet.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listItemNumber}>{'2. '}</Text>
            <Text style={styles.listItemContent}>
              You&rsquo;ll be able to use your ENS name and avatar in the app.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listItemNumber}>{'3. '}</Text>
            <Text style={styles.listItemContent}>
              You can choose to skip setting a password, and to log in with your
              Ethereum wallet instead.
            </Text>
          </View>
        </View>
      </>
    );
  }

  const { navigate } = props.navigation;
  const onSkip = React.useCallback(() => {
    navigate<'UsernameSelection'>({
      name: UsernameSelectionRouteName,
      params: {
        userSelections,
      },
    });
  }, [navigate, userSelections]);

  const keyserverURL = userSelections?.keyserverURL ?? defaultURLPrefix;
  const serverCallParamOverride = React.useMemo(
    () => ({
      urlPrefix: keyserverURL,
    }),
    [keyserverURL],
  );

  const exactSearchUserCall = useLegacyAshoatKeyserverCall(
    exactSearchUser,
    serverCallParamOverride,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  const getEthereumAccountFromSIWEResult =
    useGetEthereumAccountFromSIWEResult();

  const onSuccessfulWalletSignature = React.useCallback(
    async (result: SIWEResult) => {
      let userAlreadyExists;
      if (usingCommServicesAccessToken) {
        const findUserIDResponseString =
          await commRustModule.findUserIDForWalletAddress(result.address);
        const findUserIDResponse = JSON.parse(findUserIDResponseString);
        userAlreadyExists =
          !!findUserIDResponse.userID || findUserIDResponse.isReserved;
      } else {
        const searchPromise = exactSearchUserCall(result.address);
        void dispatchActionPromise(exactSearchUserActionTypes, searchPromise);
        const { userInfo } = await searchPromise;
        userAlreadyExists = !!userInfo;
      }

      if (userAlreadyExists) {
        navigate<'ExistingEthereumAccount'>({
          name: ExistingEthereumAccountRouteName,
          params: result,
        });
        return;
      }

      const ethereumAccount = await getEthereumAccountFromSIWEResult(result);

      const newUserSelections = {
        ...userSelections,
        accountSelection: ethereumAccount,
      };
      navigate<'AvatarSelection'>({
        name: AvatarSelectionRouteName,
        params: {
          userSelections: newUserSelections,
        },
      });
    },
    [
      userSelections,
      exactSearchUserCall,
      dispatchActionPromise,
      navigate,
      getEthereumAccountFromSIWEResult,
    ],
  );

  const {
    panelState,
    onPanelClosed,
    onPanelClosing,
    siwePanelSetLoading,
    openPanel,
  } = useSIWEPanelState();

  let siwePanel;
  if (panelState !== 'closed') {
    siwePanel = (
      <SIWEPanel
        onClosing={onPanelClosing}
        onClosed={onPanelClosed}
        closing={panelState === 'closing'}
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        siweSignatureRequestData={siweSignatureRequestData}
        setLoading={siwePanelSetLoading}
        keyserverCallParamOverride={serverCallParamOverride}
      />
    );
  }

  const { ethereumAccount } = cachedSelections;
  invariant(
    !ethereumAccount || ethereumAccount.nonceTimestamp,
    'nonceTimestamp must be set after connecting to Ethereum account',
  );
  const nonceExpired =
    ethereumAccount &&
    ethereumAccount.nonceTimestamp &&
    siweNonceExpired(ethereumAccount.nonceTimestamp);
  const alreadyHasConnected = !!ethereumAccount && !nonceExpired;
  React.useEffect(() => {
    if (nonceExpired) {
      setCachedSelections(oldUserSelections => ({
        ...oldUserSelections,
        ethereumAccount: undefined,
      }));
    }
  }, [nonceExpired, setCachedSelections]);

  const exactSearchUserCallLoading = useSelector(
    state => exactSearchUserLoadingStatusSelector(state) === 'loading',
  );
  const defaultConnectButtonVariant = alreadyHasConnected
    ? 'outline'
    : 'enabled';
  const connectButtonVariant =
    exactSearchUserCallLoading || panelState === 'opening'
      ? 'loading'
      : defaultConnectButtonVariant;
  const connectButtonText = alreadyHasConnected
    ? 'Connect new Ethereum wallet'
    : 'Connect Ethereum wallet';

  const onUseAlreadyConnectedWallet = React.useCallback(() => {
    invariant(
      ethereumAccount,
      'ethereumAccount should be set in onUseAlreadyConnectedWallet',
    );
    const newUserSelections = {
      ...userSelections,
      accountSelection: ethereumAccount,
    };
    navigate<'AvatarSelection'>({
      name: AvatarSelectionRouteName,
      params: {
        userSelections: newUserSelections,
      },
    });
  }, [ethereumAccount, userSelections, navigate]);

  let alreadyConnectedButton;
  if (alreadyHasConnected) {
    alreadyConnectedButton = (
      <PrimaryButton
        onPress={onUseAlreadyConnectedWallet}
        label="Use connected Ethereum wallet"
        variant="enabled"
      />
    );
  }

  return (
    <>
      <AuthContainer>
        <AuthContentContainer style={styles.scrollViewContentContainer}>
          <Text style={styles.header}>
            Do you want to connect an Ethereum wallet?
          </Text>
          {body}
          <View style={styles.ethereumLogoContainer}>
            <EthereumLogoDark />
          </View>
        </AuthContentContainer>
        <AuthButtonContainer>
          {alreadyConnectedButton}
          <PrimaryButton
            onPress={openPanel}
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
      {siwePanel}
    </>
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
  ethereumLogoContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
  },
  listItemNumber: {
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
  },
  listItemContent: {
    fontFamily: 'Arial',
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
  },
};

export default ConnectEthereum;
