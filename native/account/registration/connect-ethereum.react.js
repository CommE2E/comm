// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import {
  exactSearchUser,
  exactSearchUserActionTypes,
} from 'lib/actions/user-actions.js';
import { ENSCacheContext } from 'lib/components/ens-cache-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  type CoolOrNerdMode,
  ensAvatarSelection,
} from './registration-types.js';
import {
  type NavigationRoute,
  ExistingEthereumAccountRouteName,
  UsernameSelectionRouteName,
  AvatarSelectionRouteName,
} from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import EthereumLogoDark from '../../vectors/ethereum-logo-dark.react.js';
import SIWEPanel from '../siwe-panel.react.js';

const exactSearchUserLoadingStatusSelector = createLoadingStatusSelector(
  exactSearchUserActionTypes,
);

export type ConnectEthereumParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverURL: string,
  },
};

type PanelState = 'closed' | 'opening' | 'open' | 'closing';

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectEthereum'>,
  +route: NavigationRoute<'ConnectEthereum'>,
};
function ConnectEthereum(props: Props): React.Node {
  const { params } = props.route;
  const { userSelections } = props.route.params;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { setCachedSelections } = registrationContext;

  const isNerdMode = userSelections.coolOrNerdMode === 'nerd';
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

  const [panelState, setPanelState] = React.useState<PanelState>('closed');
  const openPanel = React.useCallback(() => {
    setPanelState('opening');
  }, []);
  const onPanelClosed = React.useCallback(() => {
    setPanelState('closed');
  }, []);
  const onPanelClosing = React.useCallback(() => {
    setPanelState('closing');
  }, []);

  const siwePanelSetLoading = React.useCallback(
    (loading: boolean) => {
      if (panelState === 'closing' || panelState === 'closed') {
        return;
      }
      setPanelState(loading ? 'opening' : 'open');
    },
    [panelState],
  );

  const { navigate } = props.navigation;
  const onSkip = React.useCallback(() => {
    navigate<'UsernameSelection'>({
      name: UsernameSelectionRouteName,
      params,
    });
  }, [navigate, params]);

  const { keyserverURL } = userSelections;
  const serverCallParamOverride = React.useMemo(
    () => ({
      urlPrefix: keyserverURL,
    }),
    [keyserverURL],
  );

  const exactSearchUserCall = useServerCall(
    exactSearchUser,
    serverCallParamOverride,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;

  const onSuccessfulWalletSignature = React.useCallback(
    async (result: SIWEResult) => {
      const searchPromise = exactSearchUserCall(result.address);
      dispatchActionPromise(exactSearchUserActionTypes, searchPromise);

      // We want to figure out if the user has an ENS avatar now
      // so that we can default to the ENS avatar in AvatarSelection
      const avatarURIPromise = (async () => {
        if (!ensCache) {
          return null;
        }
        return await ensCache.getAvatarURIForAddress(result.address);
      })();

      const { userInfo } = await searchPromise;

      if (userInfo) {
        navigate<'ExistingEthereumAccount'>({
          name: ExistingEthereumAccountRouteName,
          params: result,
        });
        return;
      }

      const avatarURI = await avatarURIPromise;

      const ethereumAccount = {
        accountType: 'ethereum',
        ...result,
        avatarURI,
      };

      setCachedSelections(oldUserSelections => {
        const base = {
          ...oldUserSelections,
          ethereumAccount,
        };
        if (base.avatarData || !avatarURI) {
          return base;
        }
        return {
          ...base,
          avatarData: ensAvatarSelection,
        };
      });

      const newUserSelections = {
        ...userSelections,
        accountSelection: ethereumAccount,
      };
      navigate<'AvatarSelection'>({
        name: AvatarSelectionRouteName,
        params: { userSelections: newUserSelections },
      });
    },
    [
      userSelections,
      exactSearchUserCall,
      dispatchActionPromise,
      setCachedSelections,
      navigate,
      ensCache,
    ],
  );

  let siwePanel;
  if (panelState !== 'closed') {
    siwePanel = (
      <SIWEPanel
        onClosing={onPanelClosing}
        onClosed={onPanelClosed}
        closing={panelState === 'closing'}
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        setLoading={siwePanelSetLoading}
        keyserverCallParamOverride={serverCallParamOverride}
      />
    );
  }

  const exactSearchUserCallLoading = useSelector(
    state => exactSearchUserLoadingStatusSelector(state) === 'loading',
  );
  const connectButtonVariant =
    exactSearchUserCallLoading || panelState === 'opening'
      ? 'loading'
      : 'enabled';

  return (
    <>
      <RegistrationContainer>
        <RegistrationContentContainer style={styles.scrollViewContentContainer}>
          <Text style={styles.header}>
            Do you want to connect an Ethereum wallet?
          </Text>
          {body}
          <View style={styles.ethereumLogoContainer}>
            <EthereumLogoDark />
          </View>
        </RegistrationContentContainer>
        <RegistrationButtonContainer>
          <RegistrationButton
            onPress={openPanel}
            label="Connect Ethereum wallet"
            variant={connectButtonVariant}
          />
          <RegistrationButton
            onPress={onSkip}
            label="Do not connect"
            variant="outline"
          />
        </RegistrationButtonContainer>
      </RegistrationContainer>
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
