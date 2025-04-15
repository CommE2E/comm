// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useWalletLogIn } from 'lib/hooks/login-hooks.js';
import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { useGetEthereumAccountFromSIWEResult } from './registration/ethereum-utils.js';
import { RegistrationContext } from './registration/registration-context.js';
import SIWEPanel from './siwe-panel.react.js';
import { commRustModule } from '../native-modules.js';
import {
  AccountDoesNotExistRouteName,
  AuthRouteName,
} from '../navigation/route-names.js';
import {
  unknownErrorAlertDetails,
  appOutOfDateAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

const siweSignatureRequestData = { messageType: SIWEMessageTypes.MSG_AUTH };

type Props = {
  +goBackToPrompt: () => mixed,
  +closing: boolean,
};
function FullscreenSIWEPanel(props: Props): React.Node {
  const [loading, setLoading] = React.useState(true);

  const activity = loading ? <ActivityIndicator size="large" /> : null;

  const activityContainer = React.useMemo(
    () => ({
      flex: 1,
    }),
    [],
  );

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { setSkipEthereumLoginOnce } = registrationContext;

  const getEthereumAccountFromSIWEResult =
    useGetEthereumAccountFromSIWEResult();
  const { navigate } = useNavigation();
  const { goBackToPrompt } = props;
  const onAccountDoesNotExist = React.useCallback(
    async (result: SIWEResult) => {
      await getEthereumAccountFromSIWEResult(result);
      setSkipEthereumLoginOnce(true);
      goBackToPrompt();
      navigate<'Auth'>(AuthRouteName, {
        screen: AccountDoesNotExistRouteName,
      });
    },
    [
      getEthereumAccountFromSIWEResult,
      navigate,
      goBackToPrompt,
      setSkipEthereumLoginOnce,
    ],
  );

  const onNonceExpired = React.useCallback(
    (registrationOrLogin: 'registration' | 'login') => {
      Alert.alert(
        registrationOrLogin === 'registration'
          ? 'Registration attempt timed out'
          : 'Login attempt timed out',
        'Please try again',
        [{ text: 'OK', onPress: goBackToPrompt }],
        { cancelable: false },
      );
    },
    [goBackToPrompt],
  );

  const walletLogIn = useWalletLogIn();
  const successRef = React.useRef(false);
  const onSuccess = React.useCallback(
    async (result: SIWEResult) => {
      successRef.current = true;
      try {
        const findUserIDResponseString =
          await commRustModule.findUserIDForWalletAddress(result.address);
        const findUserIDResponse = JSON.parse(findUserIDResponseString);
        if (findUserIDResponse.userID || findUserIDResponse.isReserved) {
          try {
            await walletLogIn(result.address, result.message, result.signature);
          } catch (e) {
            const messageForException = getMessageForException(e);
            if (messageForException === 'nonce_expired') {
              onNonceExpired('login');
            } else if (
              messageForException === 'unsupported_version' ||
              messageForException === 'client_version_unsupported' ||
              messageForException === 'use_new_flow'
            ) {
              Alert.alert(
                appOutOfDateAlertDetails.title,
                appOutOfDateAlertDetails.message,
                [{ text: 'OK', onPress: goBackToPrompt }],
                { cancelable: false },
              );
            } else {
              throw e;
            }
          }
        } else {
          await onAccountDoesNotExist(result);
        }
      } catch (e) {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [{ text: 'OK', onPress: goBackToPrompt }],
          { cancelable: false },
        );
      }
    },
    [walletLogIn, goBackToPrompt, onAccountDoesNotExist, onNonceExpired],
  );

  const ifBeforeSuccessGoBackToPrompt = React.useCallback(() => {
    if (!successRef.current) {
      goBackToPrompt();
    }
  }, [goBackToPrompt]);

  const { closing } = props;
  return (
    <>
      <View style={activityContainer}>{activity}</View>
      <SIWEPanel
        closing={closing}
        onClosed={ifBeforeSuccessGoBackToPrompt}
        onClosing={ifBeforeSuccessGoBackToPrompt}
        onSuccessfulWalletSignature={onSuccess}
        siweSignatureRequestData={siweSignatureRequestData}
        setLoading={setLoading}
      />
    </>
  );
}

export default FullscreenSIWEPanel;
