// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { legacySiweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import { useENSName } from 'lib/hooks/ens-cache.js';
import { useWalletLogIn } from 'lib/hooks/login-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import { UnknownErrorAlertDetails } from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import { useLegacySIWEServerCall } from '../siwe-hooks.js';

const legacySiweAuthLoadingStatusSelector = createLoadingStatusSelector(
  legacySiweAuthActionTypes,
);

export type ExistingEthereumAccountParams = SIWEResult;

type Props = {
  +navigation: RegistrationNavigationProp<'ExistingEthereumAccount'>,
  +route: NavigationRoute<'ExistingEthereumAccount'>,
};
function ExistingEthereumAccount(props: Props): React.Node {
  const legacySiweServerCall = useLegacySIWEServerCall();
  const walletLogIn = useWalletLogIn();

  const { params } = props.route;
  const dispatch = useDispatch();
  const onProceedToLogIn = React.useCallback(async () => {
    if (usingCommServicesAccessToken) {
      try {
        await walletLogIn(params.address, params.message, params.signature);
      } catch (e) {
        Alert.alert(
          UnknownErrorAlertDetails.title,
          UnknownErrorAlertDetails.message,
          [{ text: 'OK' }],
          {
            cancelable: false,
          },
        );
        throw e;
      }
    } else {
      try {
        await legacySiweServerCall({ ...params, doNotRegister: true });
      } catch (e) {
        Alert.alert(
          UnknownErrorAlertDetails.title,
          UnknownErrorAlertDetails.message,
          [{ text: 'OK' }],
          {
            cancelable: false,
          },
        );
        throw e;
      }
      dispatch({
        type: setDataLoadedActionType,
        payload: {
          dataLoaded: true,
        },
      });
    }
  }, [legacySiweServerCall, walletLogIn, params, dispatch]);

  const legacySiweAuthCallLoading = useSelector(
    state => legacySiweAuthLoadingStatusSelector(state) === 'loading',
  );

  const { address } = params;
  const walletIdentifier = useENSName(address);
  const walletIdentifierTitle =
    walletIdentifier === address ? 'Ethereum wallet' : 'ENS name';

  const { goBack } = props.navigation;
  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Account already exists for wallet</Text>
        <Text style={styles.body}>
          You can proceed to log in with this wallet, or go back and use a
          different wallet.
        </Text>
        <View style={styles.walletTile}>
          <Text style={styles.walletIdentifierTitleText}>
            {walletIdentifierTitle}
          </Text>
          <View style={styles.walletIdentifier}>
            <Text style={styles.walletIdentifierText} numberOfLines={1}>
              {walletIdentifier}
            </Text>
          </View>
        </View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceedToLogIn}
          label="Log in to account"
          variant={legacySiweAuthCallLoading ? 'loading' : 'enabled'}
        />
        <RegistrationButton
          onPress={goBack}
          label="Use a different wallet"
          variant="outline"
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
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
    paddingBottom: 40,
  },
  walletTile: {
    backgroundColor: 'panelForeground',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  walletIdentifierTitleText: {
    fontSize: 17,
    color: 'panelForegroundLabel',
    textAlign: 'center',
  },
  walletIdentifier: {
    backgroundColor: 'panelSecondaryForeground',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 56,
    marginTop: 8,
    alignItems: 'center',
  },
  walletIdentifierText: {
    fontSize: 15,
    color: 'panelForegroundLabel',
  },
};

export default ExistingEthereumAccount;
