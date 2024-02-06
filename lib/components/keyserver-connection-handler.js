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
import { setNewSession } from '../keyserver-conn/keyserver-conn-types.js';
import { resolveKeyserverSessionInvalidation } from '../keyserver-conn/recovery-utils.js';
import { filterThreadIDsInFilterList } from '../reducers/calendar-filters-reducer.js';
import {
  connectionSelector,
  cookieSelector,
  deviceTokenSelector,
  urlPrefixSelector,
  sessionIDSelector,
} from '../selectors/keyserver-selectors.js';
import { isLoggedInToKeyserver } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { OlmSessionCreatorContext } from '../shared/olm-session-creator-context.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
import { logInActionSources } from '../types/account-types.js';
import { genericCookieInvalidation } from '../types/session-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';
import sleep from '../utils/sleep.js';

type Props = {
  ...BaseSocketProps,
  +socketComponent: React.ComponentType<BaseSocketProps>,
};

const AUTH_RETRY_DELAY_MS = 60000;
const CANCELLED_ERROR = 'cancelled';

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
    if (hasConnectionIssue && !usingCommServicesAccessToken) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, hasConnectionIssue, dispatchActionPromise]);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const olmSessionCreator = React.useContext(OlmSessionCreatorContext);
  invariant(olmSessionCreator, 'Olm session creator should be set');

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
        const keyserverKeys =
          await identityClient.getKeyserverKeys(keyserverID);

        if (cancelled) {
          throw new Error(CANCELLED_ERROR);
        }

        const [notifsSession, contentSession, { userID, deviceID }] =
          await Promise.all([
            olmSessionCreator.notificationsSessionCreator(
              cookie,
              keyserverKeys.identityKeysBlob.notificationIdentityPublicKeys,
              keyserverKeys.notifInitializationInfo,
              keyserverID,
            ),
            olmSessionCreator.contentSessionCreator(
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
          (async () => {
            const result = await keyserverAuth({
              userID,
              deviceID,
              doNotRegister: false,
              calendarQuery,
              deviceTokenUpdateInput,
              logInActionSource: process.env.BROWSER
                ? logInActionSources.keyserverAuthFromWeb
                : logInActionSources.keyserverAuthFromNative,
              keyserverData: {
                [keyserverID]: {
                  initialContentEncryptedMessage: contentSession,
                  initialNotificationsEncryptedMessage: notifsSession,
                },
              },
            });
            if (cancelled) {
              throw new Error(CANCELLED_ERROR);
            }
            return result;
          })(),
        );
      } catch (e) {
        if (cancelled) {
          return;
        }

        console.log(
          `Error while authenticating to keyserver with id ${keyserverID}`,
          e,
        );

        if (!dataLoaded && keyserverID === authoritativeKeyserverID()) {
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
    olmSessionCreator,
  ]);

  const sessionRecoveryInProgress = useSelector(
    state =>
      state.keyserverStore.keyserverInfos[keyserverID]?.connection
        .sessionRecoveryInProgress,
  );

  const preRequestUserInfo = useSelector(state => state.currentUserInfo);
  const sessionID = useSelector(sessionIDSelector(keyserverID));
  const preRequestUserState = React.useMemo(
    () => ({
      currentUserInfo: preRequestUserInfo,
      cookiesAndSessions: {
        [keyserverID]: {
          cookie,
          sessionID,
        },
      },
    }),
    [preRequestUserInfo, keyserverID, cookie, sessionID],
  );

  // We only need to do a "spot check" on this value below.
  // - To avoid regenerating performRecovery whenever it changes, we want to
  //   make sure it's not in that function's dep list.
  // - If we exclude it from that function's dep list, we'll end up binding in
  //   the value of preRequestUserState at the time performRecovery is updated.
  //   Instead, by assigning to a ref, we are able to use the latest value.
  const preRequestUserStateRef = React.useRef(preRequestUserState);
  preRequestUserStateRef.current = preRequestUserState;

  const dispatch = useDispatch();
  const urlPrefix = useSelector(urlPrefixSelector(keyserverID));
  const performRecovery = React.useCallback(() => {
    invariant(
      urlPrefix,
      `urlPrefix for ${keyserverID} should be set during performRecovery`,
    );

    setAuthInProgress(true);

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      setAuthInProgress(false);
    };

    const promise = (async () => {
      const userStateBeforeRecovery = preRequestUserStateRef.current;
      try {
        const recoverySessionChange = await resolveKeyserverSessionInvalidation(
          dispatch,
          cookie,
          urlPrefix,
          logInActionSources.cookieInvalidationResolutionAttempt,
          keyserverID,
        );
        if (cancelled) {
          // TODO: cancellation won't work because above call handles Redux
          // dispatch directly
          throw new Error(CANCELLED_ERROR);
        }
        const sessionChange =
          recoverySessionChange ?? genericCookieInvalidation;
        if (
          sessionChange.cookieInvalidated ||
          !sessionChange.cookie ||
          !sessionChange.cookie.startsWith('user=')
        ) {
          setNewSession(
            dispatch,
            sessionChange,
            userStateBeforeRecovery,
            null,
            logInActionSources.cookieInvalidationResolutionAttempt,
            keyserverID,
          );
        }
      } catch (e) {
        if (cancelled) {
          return;
        }

        console.log(
          `Error while recovering session with keyserver id ${keyserverID}`,
          e,
        );

        setNewSession(
          dispatch,
          genericCookieInvalidation,
          userStateBeforeRecovery,
          null,
          logInActionSources.cookieInvalidationResolutionAttempt,
          keyserverID,
        );
      } finally {
        if (!cancelled) {
          setAuthInProgress(false);
        }
      }
    })();
    return [promise, cancel];
  }, [dispatch, cookie, urlPrefix, keyserverID]);

  const cancelPendingAuth = React.useRef<?() => void>(null);
  const prevPerformAuth = React.useRef(performAuth);
  const isUserAuthenticated = useSelector(isLoggedInToKeyserver(keyserverID));
  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);

  const cancelPendingRecovery = React.useRef<?() => void>(null);
  const prevPerformRecovery = React.useRef(performRecovery);

  React.useEffect(() => {
    if (sessionRecoveryInProgress && isUserAuthenticated) {
      cancelPendingAuth.current?.();
      cancelPendingAuth.current = null;

      if (prevPerformRecovery.current !== performRecovery) {
        cancelPendingRecovery.current?.();
        cancelPendingRecovery.current = null;
        prevPerformRecovery.current = performRecovery;
      }

      if (!authInProgress) {
        const [, cancel] = performRecovery();
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
    sessionRecoveryInProgress,
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
