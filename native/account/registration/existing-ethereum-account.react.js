// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import { useDispatch } from 'react-redux';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import { useENSName } from 'lib/hooks/ens-cache.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';
import { useSIWEServerCall } from '../siwe-hooks.js';

const siweAuthLoadingStatusSelector =
  createLoadingStatusSelector(siweAuthActionTypes);

export type ExistingEthereumAccountParams = SIWEResult;

type Props = {
  +navigation: RegistrationNavigationProp<'ExistingEthereumAccount'>,
  +route: NavigationRoute<'ExistingEthereumAccount'>,
};
function ExistingEthereumAccount(props: Props): React.Node {
  const siweServerCallParams = React.useMemo(() => {
    const onServerCallFailure = () => {
      Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
        cancelable: false,
      });
    };
    return { onFailure: onServerCallFailure };
  }, []);
  const siweServerCall = useSIWEServerCall(siweServerCallParams);

  const { params } = props.route;
  const dispatch = useDispatch();
  const onProceedToLogIn = React.useCallback(async () => {
    await siweServerCall(params);
    dispatch({
      type: setDataLoadedActionType,
      payload: {
        dataLoaded: true,
      },
    });
  }, [siweServerCall, params, dispatch]);

  const siweAuthCallLoading = useSelector(
    state => siweAuthLoadingStatusSelector(state) === 'loading',
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
          variant={siweAuthCallLoading ? 'loading' : 'enabled'}
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
