// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  keyserverAuthActionTypes,
  logOutActionTypes,
  useKeyserverAuth,
  useLogOut,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import {
  CANCELLED_ERROR,
  type CallKeyserverEndpoint,
} from '../keyserver-conn/keyserver-conn-types.js';
import { useKeyserverRecoveryLogIn } from '../keyserver-conn/recovery-utils.js';
import { filterThreadIDsInFilterList } from '../reducers/calendar-filters-reducer.js';
import {
  connectionSelector,
  cookieSelector,
  deviceTokenSelector,
} from '../selectors/keyserver-selectors.js';
import { isLoggedInToKeyserver } from '../selectors/user-selectors.js';
import { useInitialNotificationsEncryptedMessage } from '../shared/crypto-utils.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
import {
  logInActionSources,
  type RecoveryActionSource,
} from '../types/account-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import type { CallSingleKeyserverEndpoint } from '../utils/call-single-keyserver-endpoint.js';
import { getConfig } from '../utils/config.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  relyingOnAuthoritativeKeyserver,
} from '../utils/services-utils.js';
import sleep from '../utils/sleep.js';

type Props = {
  ...BaseSocketProps,
  +socketComponent: React.ComponentType<BaseSocketProps>,
};

const AUTH_RETRY_DELAY_MS = 60000;

function KeyserverConnectionHandler(props: Props) {
  const { socketComponent: Socket, ...socketProps } = props;
  const { keyserverID } = props;

  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();
  const keyserverAuth = useKeyserverAuth();

  const hasConnectionIssue = useSelector(
    state => !!connectionSelector(keyserverID)(state)?.connectionIssue,
  );
  const cookie = useSelector(cookieSelector(keyserverID));
  const dataLoaded = useSelector(state => state.dataLoaded);

  const keyserverDeviceToken = useSelector(deviceTokenSelector(keyserverID));
  // We have an assumption that we should be always connected to Ashoat's
  // keyserver. It is possible that a token which it has is correct, so we can
  // try to use it. In worst case it is invalid and our push-handler will try
  // to fix it.
  const ashoatKeyserverDeviceToken = useSelector(
    deviceTokenSelector(authoritativeKeyserverID()),
  );
  const deviceToken = keyserverDeviceToken ?? ashoatKeyserverDeviceToken;

  const navInfo = useSelector(state => state.navInfo);
  const calendarFilters = useSelector(state => state.calendarFilters);
  const calendarQuery = React.useMemo(() => {
    const filters = filterThreadIDsInFilterList(
      calendarFilters,
      (threadID: string) => extractKeyserverIDFromID(threadID) === keyserverID,
    );
    return {
      startDate: navInfo.startDate,
      endDate: navInfo.endDate,
      filters,
    };
  }, [calendarFilters, keyserverID, navInfo.endDate, navInfo.startDate]);

  React.useEffect(() => {
    if (
      hasConnectionIssue &&
      keyserverID === authoritativeKeyserverID() &&
      relyingOnAuthoritativeKeyserver
    ) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, hasConnectionIssue, dispatchActionPromise, keyserverID]);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const { olmAPI } = getConfig();

  const [authInProgress, setAuthInProgress] = React.useState(false);
  const performAuth = React.useCallback(() => {
    setAuthInProgress(true);

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      setAuthInProgress(false);
    };

    const promise = (async () => {
      try {
        const [keyserverKeys] = await Promise.all([
          identityClient.getKeyserverKeys(keyserverID),
          olmAPI.initializeCryptoAccount(),
        ]);

        if (cancelled) {
          throw new Error(CANCELLED_ERROR);
        }

        const [notifsSession, contentSession, { userID, deviceID }] =
          await Promise.all([
            olmAPI.notificationsSessionCreator(
              cookie,
              keyserverKeys.identityKeysBlob.notificationIdentityPublicKeys,
              keyserverKeys.notifInitializationInfo,
              keyserverID,
            ),
            olmAPI.contentOutboundSessionCreator(
              keyserverKeys.identityKeysBlob.primaryIdentityPublicKeys,
              keyserverKeys.contentInitializationInfo,
            ),
            getAuthMetadata(),
          ]);

        invariant(userID, 'userID should be set');
        invariant(deviceID, 'deviceID should be set');

        const deviceTokenUpdateInput = deviceToken
          ? { [keyserverID]: { deviceToken } }
          : {};

        if (cancelled) {
          throw new Error(CANCELLED_ERROR);
        }

        await dispatchActionPromise(
          keyserverAuthActionTypes,
          keyserverAuth({
            userID,
            deviceID,
            doNotRegister: false,
            calendarQuery,
            deviceTokenUpdateInput,
            authActionSource: process.env.BROWSER
              ? logInActionSources.keyserverAuthFromWeb
              : logInActionSources.keyserverAuthFromNative,
            keyserverData: {
              [keyserverID]: {
                initialContentEncryptedMessage: contentSession.message,
                initialNotificationsEncryptedMessage: notifsSession,
              },
            },
          }),
        );
      } catch (e) {
        if (cancelled) {
          return;
        }

        console.log(
          `Error while authenticating to keyserver with id ${keyserverID}`,
          e,
        );

        if (
          !dataLoaded &&
          keyserverID === authoritativeKeyserverID() &&
          relyingOnAuthoritativeKeyserver
        ) {
          await dispatchActionPromise(logOutActionTypes, callLogOut());
        }
      } finally {
        if (!cancelled) {
          await sleep(AUTH_RETRY_DELAY_MS);
          setAuthInProgress(false);
        }
      }
    })();
    return [promise, cancel];
  }, [
    calendarQuery,
    callLogOut,
    cookie,
    dataLoaded,
    deviceToken,
    dispatchActionPromise,
    getAuthMetadata,
    identityClient,
    keyserverAuth,
    keyserverID,
    olmAPI,
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
      recoveryActionSource: RecoveryActionSource,
      hasBeenCancelled: () => boolean,
    ) =>
      async (
        callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
        callKeyserverEndpoint: CallKeyserverEndpoint,
      ) => {
        if (!resolveKeyserverSessionInvalidationUsingNativeCredentials) {
          return;
        }
        await resolveKeyserverSessionInvalidationUsingNativeCredentials(
          callSingleKeyserverEndpoint,
          callKeyserverEndpoint,
          dispatchActionPromise,
          recoveryActionSource,
          keyserverID,
          getInitialNotificationsEncryptedMessageForRecovery,
          hasBeenCancelled,
        );
      },
    [
      resolveKeyserverSessionInvalidationUsingNativeCredentials,
      dispatchActionPromise,
      keyserverID,
      getInitialNotificationsEncryptedMessageForRecovery,
    ],
  );

  const keyserverRecoveryLogIn = useKeyserverRecoveryLogIn(keyserverID);
  const performRecovery = React.useCallback(
    (recoveryActionSource: RecoveryActionSource) => {
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
            innerPerformRecovery(recoveryActionSource, hasBeenCancelled),
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
  const isUserAuthenticated = useSelector(isLoggedInToKeyserver(keyserverID));
  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);

  const cancelPendingRecovery = React.useRef<?() => void>(null);
  const prevPerformRecovery = React.useRef(performRecovery);

  React.useEffect(() => {
    if (activeSessionRecovery && isUserAuthenticated) {
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

    if (!hasAccessToken) {
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;
    }

    if (
      !usingCommServicesAccessToken ||
      isUserAuthenticated ||
      !hasAccessToken
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
    isUserAuthenticated,
    performAuth,
  ]);

  return <Socket {...socketProps} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;
