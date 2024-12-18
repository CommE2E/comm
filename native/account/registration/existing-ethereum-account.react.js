// @flow

import type {
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
} from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { useENSName } from 'lib/hooks/ens-cache.js';
import { useWalletLogIn } from 'lib/hooks/login-hooks.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import AuthButtonContainer from './registration-button-container.react.js';
import AuthContainer from './registration-container.react.js';
import AuthContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import type {
  NavigationRoute,
  ScreenParamList,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import {
  unknownErrorAlertDetails,
  appOutOfDateAlertDetails,
} from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import { useLegacySIWEServerCall } from '../siwe-hooks.js';

export type ExistingEthereumAccountParams = SIWEResult;

type Props = {
  +navigation: RegistrationNavigationProp<'ExistingEthereumAccount'>,
  +route: NavigationRoute<'ExistingEthereumAccount'>,
};
function ExistingEthereumAccount(props: Props): React.Node {
  const legacySiweServerCall = useLegacySIWEServerCall();
  const walletLogIn = useWalletLogIn();

  const [logInPending, setLogInPending] = React.useState(false);

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { setCachedSelections } = registrationContext;

  const { params } = props.route;
  const dispatch = useDispatch();
  const { navigation } = props;
  const goBackToHome = navigation.getParent<
    ScreenParamList,
    'Registration',
    StackNavigationState,
    StackOptions,
    StackNavigationEventMap,
    RootNavigationProp<'Registration'>,
  >()?.goBack;
  const onProceedToLogIn = React.useCallback(async () => {
    if (logInPending) {
      return;
    }
    setLogInPending(true);
    try {
      if (usingCommServicesAccessToken) {
        await walletLogIn(params.address, params.message, params.signature);
      } else {
        await legacySiweServerCall({ ...params, doNotRegister: true });
        dispatch({
          type: setDataLoadedActionType,
          payload: {
            dataLoaded: true,
          },
        });
      }
    } catch (e) {
      const messageForException = getMessageForException(e);
      if (messageForException === 'nonce_expired') {
        setCachedSelections(oldUserSelections => ({
          ...oldUserSelections,
          ethereumAccount: undefined,
        }));
        Alert.alert(
          'Login attempt timed out',
          'Try logging in from the main SIWE button on the home screen',
          [{ text: 'OK', onPress: goBackToHome }],
          {
            cancelable: false,
          },
        );
      } else if (
        messageForException === 'unsupported_version' ||
        messageForException === 'client_version_unsupported' ||
        messageForException === 'use_new_flow'
      ) {
        Alert.alert(
          appOutOfDateAlertDetails.title,
          appOutOfDateAlertDetails.message,
          [{ text: 'OK', onPress: goBackToHome }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [{ text: 'OK' }],
          {
            cancelable: false,
          },
        );
      }
      throw e;
    } finally {
      setLogInPending(false);
    }
  }, [
    logInPending,
    legacySiweServerCall,
    walletLogIn,
    params,
    dispatch,
    goBackToHome,
    setCachedSelections,
  ]);

  const { address } = params;
  const walletIdentifier = useENSName(address);
  const walletIdentifierTitle =
    walletIdentifier === address ? 'Ethereum wallet' : 'ENS name';

  const { goBack } = navigation;
  const styles = useStyles(unboundStyles);
  return (
    <AuthContainer>
      <AuthContentContainer>
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
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton
          onPress={onProceedToLogIn}
          label="Log in to account"
          variant={logInPending ? 'loading' : 'enabled'}
        />
        <PrimaryButton
          onPress={goBack}
          label="Use a different wallet"
          variant="outline"
        />
      </AuthButtonContainer>
    </AuthContainer>
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
