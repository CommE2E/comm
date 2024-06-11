// @flow

import * as React from 'react';

import { useCallKeyserverEndpointContext } from './call-keyserver-endpoint-provider.react.js';
import type { CallSingleKeyserverEndpoint } from './call-single-keyserver-endpoint.js';
import { useRawKeyserverAuth } from './keyserver-auth.js';
import type { CallKeyserverEndpoint } from './keyserver-conn-types.js';
import { useKeyserverRecoveryLogIn } from './recovery-utils.js';
import { logOutActionTypes, useLogOut } from '../actions/user-actions.js';
import {
  connectionSelector,
  cookieSelector,
} from '../selectors/keyserver-selectors.js';
import { isLoggedInToKeyserver } from '../selectors/user-selectors.js';
import { useInitialNotificationsEncryptedMessage } from '../shared/crypto-utils.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
import {
  logInActionSources,
  type RecoveryFromReduxActionSource,
} from '../types/account-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { getConfig } from '../utils/config.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  relyingOnAuthoritativeKeyserver,
} from '../utils/services-utils.js';

let k = 0;

type Props = {
  ...BaseSocketProps,
  +socketComponent: React.ComponentType<BaseSocketProps>,
};

function KeyserverConnectionHandler(props: Props) {
  const { socketComponent: Socket, ...socketProps } = props;
  const { keyserverID } = props;

  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const { olmAPI } = getConfig();

  const hasConnectionIssue = useSelector(
    state => !!connectionSelector(keyserverID)(state)?.connectionIssue,
  );
  const cookie = useSelector(cookieSelector(keyserverID));
  const prevCookieRef = React.useRef(cookie);
  const notifsSessionReassignmentPromise = React.useRef<?Promise<mixed>>(null);

  React.useEffect(() => {
    const prevCookie = prevCookieRef.current;
    prevCookieRef.current = cookie;

    if (cookie === prevCookie || !cookie || !cookie.startsWith('user=')) {
      return;
    }

    notifsSessionReassignmentPromise.current = (async () => {
      await notifsSessionReassignmentPromise.current;
      await olmAPI.reassignNotificationsSession?.(
        prevCookie,
        cookie,
        keyserverID,
      );
    })();
  }, [cookie, keyserverID, olmAPI]);

  const dataLoaded = useSelector(state => state.dataLoaded);

  React.useEffect(() => {
    if (
      hasConnectionIssue &&
      keyserverID === authoritativeKeyserverID() &&
      relyingOnAuthoritativeKeyserver
    ) {
      console.log('log out due to connection issue!');
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, hasConnectionIssue, dispatchActionPromise, keyserverID]);

  const rawKeyserverAuth = useRawKeyserverAuth(keyserverID);

  const [authInProgress, setAuthInProgress] = React.useState(false);
  const { callKeyserverEndpoint } = useCallKeyserverEndpointContext();
  const performAuth = React.useCallback(() => {
    setAuthInProgress(true);

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      setAuthInProgress(false);
    };
    const hasBeenCancelled = () => cancelled;

    const promise = (async () => {
      try {
        await rawKeyserverAuth({
          authActionSource: process.env.BROWSER
            ? logInActionSources.keyserverAuthFromWeb
            : logInActionSources.keyserverAuthFromNative,
          setInProgress: setAuthInProgress,
          hasBeenCancelled,
          doNotRegister: false,
        })(callKeyserverEndpoint);
      } catch (e) {
        if (
          !dataLoaded &&
          keyserverID === authoritativeKeyserverID() &&
          relyingOnAuthoritativeKeyserver
        ) {
          console.log('log out!');
          await dispatchActionPromise(logOutActionTypes, callLogOut());
        }
      }
    })();

    return [promise, cancel];
  }, [
    rawKeyserverAuth,
    callKeyserverEndpoint,
    dataLoaded,
    keyserverID,
    dispatchActionPromise,
    callLogOut,
  ]);

  const activeSessionRecovery = useSelector(
    state =>
      state.keyserverStore.keyserverInfos[keyserverID]?.connection
        .activeSessionRecovery,
  );

  // This async function asks the keyserver for its keys, whereas performAuth
  // above gets the keyserver's keys from the identity service
  const getInitialNotificationsEncryptedMessageForRecovery =
    useInitialNotificationsEncryptedMessage(keyserverID);

  const { resolveKeyserverSessionInvalidationUsingNativeCredentials } =
    getConfig();
  const innerPerformRecovery = React.useCallback(
    (
      recoveryActionSource: RecoveryFromReduxActionSource,
      setInProgress: boolean => mixed,
      hasBeenCancelled: () => boolean,
    ) =>
      async (
        callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
        innerCallKeyserverEndpoint: CallKeyserverEndpoint,
      ) => {
        const v = k++;
        if (usingCommServicesAccessToken) {
          try {
            console.log(`k${v} attempting keyserver auth!`);
            await rawKeyserverAuth({
              authActionSource: recoveryActionSource,
              setInProgress,
              hasBeenCancelled,
              doNotRegister: true,
            })(innerCallKeyserverEndpoint);
            console.log(`k${v} keyserver auth succeeded!`);
          } catch (e) {
            console.log(
              `k${v} Tried to recover session with keyserver ${keyserverID} but got ` +
                `error. Exception: ` +
                (getMessageForException(e) ?? '{no exception message}'),
            );
          }
          return;
        }
        if (!resolveKeyserverSessionInvalidationUsingNativeCredentials) {
          return;
        }
        console.log(`k${v} attempting old auth...`);
        await resolveKeyserverSessionInvalidationUsingNativeCredentials(
          callSingleKeyserverEndpoint,
          innerCallKeyserverEndpoint,
          dispatchActionPromise,
          recoveryActionSource,
          keyserverID,
          getInitialNotificationsEncryptedMessageForRecovery,
          hasBeenCancelled,
        );
      },
    [
      rawKeyserverAuth,
      resolveKeyserverSessionInvalidationUsingNativeCredentials,
      dispatchActionPromise,
      keyserverID,
      getInitialNotificationsEncryptedMessageForRecovery,
    ],
  );

  const keyserverRecoveryLogIn = useKeyserverRecoveryLogIn(keyserverID);
  const performRecovery = React.useCallback(
    (recoveryActionSource: RecoveryFromReduxActionSource) => {
      setAuthInProgress(true);

      let cancelled = false;
      const cancel = () => {
        cancelled = true;
        setAuthInProgress(false);
      };
      const hasBeenCancelled = () => cancelled;

      const promise = (async () => {
        try {
          await keyserverRecoveryLogIn(
            recoveryActionSource,
            innerPerformRecovery(
              recoveryActionSource,
              setAuthInProgress,
              hasBeenCancelled,
            ),
            hasBeenCancelled,
          );
        } finally {
          if (!cancelled) {
            setAuthInProgress(false);
          }
        }
      })();

      return [promise, cancel];
    },
    [keyserverRecoveryLogIn, innerPerformRecovery],
  );

  const cancelPendingAuth = React.useRef<?() => void>(null);
  const prevPerformAuth = React.useRef(performAuth);
  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);

  const hasCurrentUserInfo = useSelector(
    state => !!state.currentUserInfo && !state.currentUserInfo.anonymous,
  );
  const isUserLoggedInToKeyserver = useSelector(
    isLoggedInToKeyserver(keyserverID),
  );
  const canInitiateRecovery = hasCurrentUserInfo && isUserLoggedInToKeyserver;

  const cancelPendingRecovery = React.useRef<?() => void>(null);
  const prevPerformRecovery = React.useRef(performRecovery);

  React.useEffect(() => {
    if (activeSessionRecovery && canInitiateRecovery) {
      console.log(
        'session recovery initiated. cancelling pending auth',
        activeSessionRecovery,
      );
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;

      if (prevPerformRecovery.current !== performRecovery) {
        cancelPendingRecovery.current?.();
        cancelPendingRecovery.current = null;
        prevPerformRecovery.current = performRecovery;
      }

      if (!authInProgress) {
        const [, cancel] = performRecovery(activeSessionRecovery);
        cancelPendingRecovery.current = cancel;
      }

      return;
    }

    cancelPendingRecovery.current?.();
    cancelPendingRecovery.current = null;

    if (!hasAccessToken || !hasCurrentUserInfo) {
      console.log('no access token. cancelling pending auth');
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;
    }

    if (
      !usingCommServicesAccessToken ||
      isUserLoggedInToKeyserver ||
      !hasAccessToken ||
      !hasCurrentUserInfo ||
      keyserverID === authoritativeKeyserverID()
    ) {
      return;
    }

    console.log('auth might be chancelled due to change in performAuth...');
    if (prevPerformAuth.current !== performAuth) {
      console.log('cancelling pending auth due to change in performAuth');
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;
    }
    prevPerformAuth.current = performAuth;

    console.log('auth might start...');
    if (authInProgress) {
      return;
    }

    console.log('auth is starting!');
    const [, cancel] = performAuth();
    cancelPendingAuth.current = cancel;
  }, [
    activeSessionRecovery,
    authInProgress,
    performRecovery,
    hasAccessToken,
    hasCurrentUserInfo,
    keyserverID,
    isUserLoggedInToKeyserver,
    canInitiateRecovery,
    performAuth,
  ]);

  return <Socket {...socketProps} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;
