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
import type { SIWEBackupData } from 'lib/types/backup-types.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  usingRestoreFlow,
} from 'lib/utils/services-utils.js';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import { RegistrationContext } from './registration-context.js';
import LinkButton from '../../components/link-button.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  type ScreenParamList,
  QRCodeScreenRouteName,
  RestoreSIWEBackupRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import {
  unknownErrorAlertDetails,
  appOutOfDateAlertDetails,
} from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';
import { useLegacySIWEServerCall } from '../siwe-hooks.js';

export type ExistingEthereumAccountParams = $ReadOnly<{
  ...SIWEResult,
  +backupData: ?SIWEBackupData,
}>;

type Props = {
  +navigation: AuthNavigationProp<'ExistingEthereumAccount'>,
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
  const { address, message, signature, backupData } = params;
  const dispatch = useDispatch();
  const { navigation } = props;
  const goBackToHome = navigation.getParent<
    ScreenParamList,
    'Auth',
    StackNavigationState,
    StackOptions,
    StackNavigationEventMap,
    RootNavigationProp<'Auth'>,
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

  const useLegacyFlow = !backupData || !usingRestoreFlow;

  const openRestoreFlow = React.useCallback(() => {
    if (useLegacyFlow || !backupData) {
      return;
    }
    const {
      siweBackupMsgNonce,
      siweBackupMsgIssuedAt,
      siweBackupMsgStatement,
    } = backupData;
    navigation.navigate(RestoreSIWEBackupRouteName, {
      siweNonce: siweBackupMsgNonce,
      siweStatement: siweBackupMsgStatement,
      siweIssuedAt: siweBackupMsgIssuedAt,
      userIdentifier: address,
      signature,
      message,
    });
  }, [address, backupData, message, navigation, signature, useLegacyFlow]);

  const openQRScreen = React.useCallback(() => {
    navigation.navigate(QRCodeScreenRouteName);
  }, [navigation]);

  const walletIdentifier = useENSName(address);
  const walletIdentifierTitle =
    walletIdentifier === address ? 'Ethereum wallet' : 'ENS name';

  const { goBack } = navigation;
  const styles = useStyles(unboundStyles);

  let newFlowSection = null;
  if (!useLegacyFlow) {
    newFlowSection = (
      <>
        <Text style={styles.section}>
          If you still have access to your logged-in device, you can use it to
          log in by scanning the QR code.
        </Text>
        <Text style={styles.section}>
          If you’ve lost access to your logged-in device, you can try recovering
          your Comm account. Note that after completing the recovery flow, you
          will be logged out from all of your other devices.
        </Text>
        <View style={styles.linkButton}>
          <LinkButton
            text="Not logged in on another phone?"
            onPress={openRestoreFlow}
          />
        </View>
      </>
    );
  }

  const primaryAction = React.useMemo(() => {
    if (useLegacyFlow) {
      return (
        <PrimaryButton
          onPress={onProceedToLogIn}
          label="Log in to account"
          variant={logInPending ? 'loading' : 'enabled'}
        />
      );
    }
    return (
      <PrimaryButton
        onPress={openQRScreen}
        label="Log in via QR code"
        variant="enabled"
      />
    );
  }, [logInPending, onProceedToLogIn, openQRScreen, useLegacyFlow]);

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
        {newFlowSection}
      </AuthContentContainer>
      <AuthButtonContainer>
        {primaryAction}
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
  },
  walletTile: {
    backgroundColor: 'panelForeground',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
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
  section: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  linkButton: {
    alignItems: 'center',
  },
};

export default ExistingEthereumAccount;
