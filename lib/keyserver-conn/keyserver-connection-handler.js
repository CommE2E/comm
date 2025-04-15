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
import { useStaffAlert } from '../shared/staff-utils.js';
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
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

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

  const { showAlertToStaff } = useStaffAlert();

  React.useEffect(() => {
    const prevCookie = prevCookieRef.current;
    prevCookieRef.current = cookie;

    if (cookie === prevCookie || !cookie || !cookie.startsWith('user=')) {
      return;
    }

    if (prevCookie) {
      showAlertToStaff(
        'Reassigning a notif session',
        `prevCookie=${prevCookie} cookie=${cookie}`,
      );
    }

    notifsSessionReassignmentPromise.current = (async () => {
      await notifsSessionReassignmentPromise.current;
      await olmAPI.reassignNotificationsSession?.(
        prevCookie,
        cookie,
        keyserverID,
      );
    })();
  }, [cookie, keyserverID, olmAPI, showAlertToStaff]);

  const dataLoaded = useSelector(state => state.dataLoaded);

  React.useEffect(() => {
    if (
      hasConnectionIssue &&
      keyserverID === authoritativeKeyserverID() &&
      relyingOnAuthoritativeKeyserver
    ) {
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
        showAlertToStaff(
          'Performing session recovery',
          `source=${recoveryActionSource}`,
        );
        try {
          await rawKeyserverAuth({
            authActionSource: recoveryActionSource,
            setInProgress,
            hasBeenCancelled,
            doNotRegister: true,
          })(innerCallKeyserverEndpoint);
        } catch (e) {
          console.log(
            `Tried to recover session with keyserver ${keyserverID} but got ` +
              `error. Exception: ` +
              (getMessageForException(e) ?? '{no exception message}'),
          );
        }
      },
    [showAlertToStaff, rawKeyserverAuth, keyserverID],
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
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;
    }

    if (
      isUserLoggedInToKeyserver ||
      !hasAccessToken ||
      !hasCurrentUserInfo ||
      keyserverID === authoritativeKeyserverID()
    ) {
      return;
    }

    if (prevPerformAuth.current !== performAuth) {
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;
    }
    prevPerformAuth.current = performAuth;

    if (authInProgress) {
      return;
    }

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
