// @flow

import * as React from 'react';
import { Alert, Platform } from 'react-native';
import { useDispatch } from 'react-redux';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { registerActionTypes, register } from 'lib/actions/user-actions.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import type {
  RegistrationServerCallInput,
  UsernameAccountSelection,
  EthereumAccountSelection,
} from './registration-types.js';
import { NavContext } from '../../navigation/navigation-context.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../../selectors/account-selectors.js';
import { setNativeCredentials } from '../native-credentials.js';
import { useSIWEServerCall } from '../siwe-hooks.js';

function useRegistrationServerCall(): RegistrationServerCallInput => Promise<void> {
  const navContext = React.useContext(NavContext);
  const logInExtraInfo = useSelector(state =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const callRegister = useServerCall(register);

  const registerUsernameAccount = React.useCallback(
    async (accountSelection: UsernameAccountSelection) => {
      const extraInfo = await logInExtraInfo();
      const registerPromise = (async () => {
        try {
          const result = await callRegister({
            ...extraInfo,
            username: accountSelection.username,
            password: accountSelection.password,
          });
          await setNativeCredentials({
            username: result.currentUserInfo.username,
            password: accountSelection.password,
          });
          return result;
        } catch (e) {
          if (e.message === 'username_reserved') {
            Alert.alert(
              'Username reserved',
              'This username is currently reserved. Please contact support@' +
                'comm.app if you would like to claim this account.',
            );
          } else if (e.message === 'username_taken') {
            Alert.alert(
              'Username taken',
              'An account with that username already exists',
            );
          } else if (e.message === 'client_version_unsupported') {
            const app = Platform.select({
              ios: 'App Store',
              android: 'Play Store',
            });
            Alert.alert(
              'App out of date',
              'Your app version is pretty old, and the server doesn’t know how ' +
                `to speak to it anymore. Please use the ${app} app to update!`,
            );
          } else {
            Alert.alert('Unknown error', 'Uhh... try again?');
          }
          throw e;
        }
      })();
      dispatchActionPromise(
        registerActionTypes,
        registerPromise,
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
      await registerPromise;
    },
    [logInExtraInfo, callRegister, dispatchActionPromise],
  );

  const siweServerCallParams = React.useMemo(() => {
    const onServerCallFailure = () => {
      Alert.alert('Unknown error', 'Uhh... try again?');
    };
    return { onFailure: onServerCallFailure };
  }, []);
  const siweServerCall = useSIWEServerCall(siweServerCallParams);

  const registerEthereumAccount = React.useCallback(
    async (accountSelection: EthereumAccountSelection) => {
      await siweServerCall(accountSelection);
    },
    [siweServerCall],
  );

  const dispatch = useDispatch();
  return React.useCallback(
    async (input: RegistrationServerCallInput) => {
      if (input.accountSelection.accountType === 'username') {
        await registerUsernameAccount(input.accountSelection);
      } else {
        await registerEthereumAccount(input.accountSelection);
      }
      dispatch({
        type: setDataLoadedActionType,
        payload: {
          dataLoaded: true,
        },
      });
    },
    [registerUsernameAccount, registerEthereumAccount, dispatch],
  );
}

export { useRegistrationServerCall };
