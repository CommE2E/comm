// @flow

import * as React from 'react';

import { setDataLoadedActionType } from '../actions/client-db-store-actions.js';
import {
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
  useIdentityWalletLogIn,
  useIdentitySecondaryDeviceLogIn,
  logOutActionTypes,
  useIdentityLogOut,
} from '../actions/user-actions.js';
import { useKeyserverAuthWithRetry } from '../keyserver-conn/keyserver-auth.js';
import { logInActionSources } from '../types/account-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { waitUntilDatabaseDeleted } from '../utils/wait-until-db-deleted.js';

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

function useLogIn(): (identityAuthPromise: Promise<mixed>) => Promise<void> {
  const [currentStep, setCurrentStep] =
    React.useState<CurrentStep>(inactiveStep);

  const returnedFunc = React.useCallback(
    (promise: Promise<mixed>) =>
      new Promise<void>(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          if (currentStep.step !== 'inactive') {
            return;
          }
          try {
            await promise;
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
    [currentStep],
  );

  const keyserverAuth = useKeyserverAuthWithRetry(authoritativeKeyserverID());

  const isRegisteredOnIdentity = useSelector(
    state =>
      !!state.commServicesAccessToken &&
      !!state.currentUserInfo &&
      !state.currentUserInfo.anonymous,
  );

  // We call identityLogOut in order to reset state if identity auth succeeds
  // but authoritative keyserver auth fails
  const identityLogOut = useIdentityLogOut();

  const registeringOnAuthoritativeKeyserverRef = React.useRef(false);
  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
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
        dispatch({
          type: setDataLoadedActionType,
          payload: {
            dataLoaded: true,
          },
        });
        resolve();
      } catch (e) {
        void dispatchActionPromise(logOutActionTypes, identityLogOut());
        await waitUntilDatabaseDeleted();
        reject(e);
      } finally {
        setCurrentStep(inactiveStep);
        registeringOnAuthoritativeKeyserverRef.current = false;
      }
    })();
  }, [
    currentStep,
    isRegisteredOnIdentity,
    keyserverAuth,
    dispatch,
    dispatchActionPromise,
    identityLogOut,
  ]);

  return returnedFunc;
}

function usePasswordLogIn(): (
  username: string,
  password: string,
) => Promise<void> {
  const identityPasswordLogIn = useIdentityPasswordLogIn();
  const dispatchActionPromise = useDispatchActionPromise();
  const identityPasswordAuth = React.useCallback(
    (username: string, password: string) => {
      const promise = identityPasswordLogIn(username, password);
      void dispatchActionPromise(identityLogInActionTypes, promise);
      return promise;
    },
    [identityPasswordLogIn, dispatchActionPromise],
  );

  const logIn = useLogIn();
  return React.useCallback(
    (username: string, password: string) =>
      logIn(identityPasswordAuth(username, password)),
    [logIn, identityPasswordAuth],
  );
}

function useWalletLogIn(): (
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
) => Promise<void> {
  const identityWalletLogIn = useIdentityWalletLogIn();
  const dispatchActionPromise = useDispatchActionPromise();
  const identityWalletAuth = React.useCallback(
    (walletAddress: string, siweMessage: string, siweSignature: string) => {
      const promise = identityWalletLogIn(
        walletAddress,
        siweMessage,
        siweSignature,
      );
      void dispatchActionPromise(identityLogInActionTypes, promise);
      return promise;
    },
    [identityWalletLogIn, dispatchActionPromise],
  );

  const logIn = useLogIn();
  return React.useCallback(
    (walletAddress: string, siweMessage: string, siweSignature: string) =>
      logIn(identityWalletAuth(walletAddress, siweMessage, siweSignature)),
    [logIn, identityWalletAuth],
  );
}

function useSecondaryDeviceLogIn(): (userID: string) => Promise<void> {
  const identitySecondaryDeviceLogIn = useIdentitySecondaryDeviceLogIn();
  const dispatchActionPromise = useDispatchActionPromise();
  const identitySecondaryDeviceAuth = React.useCallback(
    (userID: string) => {
      const promise = identitySecondaryDeviceLogIn(userID);
      void dispatchActionPromise(identityLogInActionTypes, promise);
      return promise;
    },
    [identitySecondaryDeviceLogIn, dispatchActionPromise],
  );

  const logIn = useLogIn();
  return React.useCallback(
    (userID: string) => logIn(identitySecondaryDeviceAuth(userID)),
    [logIn, identitySecondaryDeviceAuth],
  );
}

export { usePasswordLogIn, useWalletLogIn, useSecondaryDeviceLogIn, useLogIn };
