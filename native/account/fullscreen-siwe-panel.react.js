// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { useWalletLogIn } from 'lib/hooks/login-hooks.js';
import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';
import { ServerError, getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import { useGetEthereumAccountFromSIWEResult } from './registration/ethereum-utils.js';
import { RegistrationContext } from './registration/registration-context.js';
import { useLegacySIWEServerCall } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import { commRustModule } from '../native-modules.js';
import {
  AccountDoesNotExistRouteName,
  RegistrationRouteName,
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
      navigate<'Registration'>(RegistrationRouteName, {
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

  const legacySiweServerCall = useLegacySIWEServerCall();
  const walletLogIn = useWalletLogIn();
  const successRef = React.useRef(false);
  const dispatch = useDispatch();
  const onSuccess = React.useCallback(
    async (result: SIWEResult) => {
      successRef.current = true;
      if (usingCommServicesAccessToken) {
        try {
          const findUserIDResponseString =
            await commRustModule.findUserIDForWalletAddress(result.address);
          const findUserIDResponse = JSON.parse(findUserIDResponseString);
          if (findUserIDResponse.userID || findUserIDResponse.isReserved) {
            try {
              await walletLogIn(
                result.address,
                result.message,
                result.signature,
              );
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
      } else {
        try {
          await legacySiweServerCall({
            ...result,
            doNotRegister: true,
          });
        } catch (e) {
          if (
            e instanceof ServerError &&
            e.message === 'account_does_not_exist'
          ) {
            await onAccountDoesNotExist(result);
          } else if (
            e instanceof ServerError &&
            e.message === 'client_version_unsupported'
          ) {
            Alert.alert(
              appOutOfDateAlertDetails.title,
              appOutOfDateAlertDetails.message,
              [{ text: 'OK', onPress: goBackToPrompt }],
              { cancelable: false },
            );
          } else {
            Alert.alert(
              unknownErrorAlertDetails.title,
              unknownErrorAlertDetails.message,
              [{ text: 'OK', onPress: goBackToPrompt }],
              { cancelable: false },
            );
          }
          return;
        }
        dispatch({
          type: setDataLoadedActionType,
          payload: {
            dataLoaded: true,
          },
        });
      }
    },
    [
      walletLogIn,
      goBackToPrompt,
      dispatch,
      legacySiweServerCall,
      onAccountDoesNotExist,
      onNonceExpired,
    ],
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
