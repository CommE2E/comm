// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { useWalletLogIn } from 'lib/hooks/login-hooks.js';
import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import { useGetEthereumAccountFromSIWEResult } from './registration/ethereum-utils.js';
import { RegistrationContext } from './registration/registration-context.js';
import { enableNewRegistrationMode } from './registration/registration-types.js';
import { useLegacySIWEServerCall } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import { commRustModule } from '../native-modules.js';
import {
  AccountDoesNotExistRouteName,
  RegistrationRouteName,
} from '../navigation/route-names.js';
import { UnknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import { defaultURLPrefix } from '../utils/url-utils.js';

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
  const { setSkipEthereumLoginOnce, register: registrationServerCall } =
    registrationContext;

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
            await walletLogIn(result.address, result.message, result.signature);
          } else if (enableNewRegistrationMode) {
            await onAccountDoesNotExist(result);
          } else {
            await registrationServerCall({
              coolOrNerdMode: 'cool',
              keyserverURL: defaultURLPrefix,
              farcasterID: null,
              accountSelection: {
                accountType: 'ethereum',
                ...result,
                avatarURI: null,
              },
              avatarData: null,
              clearCachedSelections: () => {},
            });
          }
        } catch (e) {
          Alert.alert(
            UnknownErrorAlertDetails.title,
            UnknownErrorAlertDetails.message,
            [{ text: 'OK', onPress: goBackToPrompt }],
            { cancelable: false },
          );
          throw e;
        }
      } else {
        try {
          await legacySiweServerCall({
            ...result,
            doNotRegister: enableNewRegistrationMode,
          });
        } catch (e) {
          if (
            e instanceof ServerError &&
            e.message === 'account_does_not_exist'
          ) {
            await onAccountDoesNotExist(result);
            return;
          }
          Alert.alert(
            UnknownErrorAlertDetails.title,
            UnknownErrorAlertDetails.message,
            [{ text: 'OK', onPress: goBackToPrompt }],
            { cancelable: false },
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
    },
    [
      walletLogIn,
      registrationServerCall,
      goBackToPrompt,
      dispatch,
      legacySiweServerCall,
      onAccountDoesNotExist,
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
        siweMessageType={SIWEMessageTypes.MSG_AUTH}
        setLoading={setLoading}
      />
    </>
  );
}

export default FullscreenSIWEPanel;
