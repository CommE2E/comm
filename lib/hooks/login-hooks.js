// @flow

import * as React from 'react';

import {
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
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
      +step: 'identity_login_dispatched',
      +resolve: () => void,
      +reject: Error => void,
    };

const inactiveStep = { step: 'inactive' };

type UsePasswordLogInInput = {
  // Called after successful identity auth, but before successful authoritative
  // keyserver auth. Used by callers to trigger local persistence of credentials
  +saveCredentials?: ?({ +username: string, +password: string }) => mixed,
};
function usePasswordLogIn(
  input?: ?UsePasswordLogInInput,
): (username: string, password: string) => Promise<void> {
  const [currentStep, setCurrentStep] =
    React.useState<CurrentStep>(inactiveStep);

  const saveCredentials = input?.saveCredentials;
  const identityPasswordLogIn = useIdentityPasswordLogIn();
  const identityLogInAction = React.useCallback(
    async (username: string, password: string) => {
      const result = await identityPasswordLogIn(username, password);
      saveCredentials?.({ username, password });
      return result;
    },
    [identityPasswordLogIn, saveCredentials],
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const returnedFunc = React.useCallback(
    (username: string, password: string) =>
      new Promise<void>(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          if (currentStep.step !== 'inactive') {
            return;
          }
          const action = identityLogInAction(username, password);
          void dispatchActionPromise(identityLogInActionTypes, action);
          try {
            await action;
            setCurrentStep({
              step: 'identity_login_dispatched',
              resolve,
              reject,
            });
          } catch (e) {
            reject(e);
          }
        },
      ),
    [currentStep, dispatchActionPromise, identityLogInAction],
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
      currentStep.step !== 'identity_login_dispatched' ||
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

export { usePasswordLogIn };
