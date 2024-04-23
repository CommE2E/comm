// @flow

import * as React from 'react';

import {
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
  useIdentityWalletLogIn,
} from '../actions/user-actions.js';
import { useKeyserverAuth } from '../keyserver-conn/keyserver-auth.js';
import { logInActionSources } from '../types/account-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

// We can't just do everything in one async callback, since the server calls
// would get bound to Redux state from before the login. In order to pick up the
// updated CSAT and currentUserInfo from Redux, we break the login into two
// steps.

type CurrentStep =
  | { +step: 'inactive' }
  | {
      +step: 'waiting_for_identity_login_in_redux',
      +resolve: () => void,
      +reject: Error => void,
    };

const inactiveStep = { step: 'inactive' };

type LogInInputs =
  | {
      +accountType: 'username',
      +username: string,
      +password: string,
    }
  | {
      +accountType: 'ethereum',
      +walletAddress: string,
      +siweMessage: string,
      +siweSignature: string,
    };

function useLogIn(): LogInInputs => Promise<void> {
  const [currentStep, setCurrentStep] =
    React.useState<CurrentStep>(inactiveStep);

  const identityPasswordLogIn = useIdentityPasswordLogIn();
  const identityWalletLogIn = useIdentityWalletLogIn();
  const dispatchActionPromise = useDispatchActionPromise();
  const returnedFunc = React.useCallback(
    (logInInputs: LogInInputs) =>
      new Promise<void>(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          if (currentStep.step !== 'inactive') {
            return;
          }
          const action =
            logInInputs.accountType === 'username'
              ? identityPasswordLogIn(
                  logInInputs.username,
                  logInInputs.password,
                )
              : identityWalletLogIn(
                  logInInputs.walletAddress,
                  logInInputs.siweMessage,
                  logInInputs.siweSignature,
                );
          void dispatchActionPromise(identityLogInActionTypes, action);
          try {
            await action;
            setCurrentStep({
              step: 'waiting_for_identity_login_in_redux',
              resolve,
              reject,
            });
          } catch (e) {
            reject(e);
          }
        },
      ),
    [currentStep, dispatchActionPromise, identityPasswordLogIn, identityWalletLogIn],
  );

  const keyserverAuth = useKeyserverAuth(authoritativeKeyserverID());

  const isRegisteredOnIdentity = useSelector(
    state =>
      !!state.commServicesAccessToken &&
      !!state.currentUserInfo &&
      !state.currentUserInfo.anonymous,
  );

  const registeringOnAuthoritativeKeyserverRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !isRegisteredOnIdentity ||
      currentStep.step !== 'waiting_for_identity_login_in_redux' ||
      registeringOnAuthoritativeKeyserverRef.current
    ) {
      return;
    }
    registeringOnAuthoritativeKeyserverRef.current = true;
    const { resolve, reject } = currentStep;
    void (async () => {
      try {
        await keyserverAuth({
          authActionSource: process.env.BROWSER
            ? logInActionSources.keyserverAuthFromWeb
            : logInActionSources.keyserverAuthFromNative,
          setInProgress: () => {},
          hasBeenCancelled: () => false,
          doNotRegister: false,
        });
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        setCurrentStep(inactiveStep);
        registeringOnAuthoritativeKeyserverRef.current = false;
      }
    })();
  }, [currentStep, isRegisteredOnIdentity, keyserverAuth]);

  return returnedFunc;
}

function usePasswordLogIn(): (
  username: string,
  password: string,
) => Promise<void> {
  const logIn = useLogIn();
  return React.useCallback(
    (username: string, password: string) =>
      logIn({
        accountType: 'username',
        username,
        password,
      }),
    [logIn],
  );
}

function useWalletLogIn(): (
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
) => Promise<void> {
  const logIn = useLogIn();
  return React.useCallback(
    (walletAddress: string, siweMessage: string, siweSignature: string) =>
      logIn({
        accountType: 'ethereum',
        walletAddress,
        siweMessage,
        siweSignature,
      }),
    [logIn],
  );
}

export { usePasswordLogIn, useWalletLogIn };
