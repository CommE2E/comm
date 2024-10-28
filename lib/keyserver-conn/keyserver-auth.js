// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useCallKeyserverEndpointContext } from './call-keyserver-endpoint-provider.react.js';
import { extractKeyserverIDFromIDOptional } from './keyserver-call-utils.js';
import {
  CANCELLED_ERROR,
  type CallKeyserverEndpoint,
} from './keyserver-conn-types.js';
import {
  keyserverAuthActionTypes,
  keyserverAuthRawAction,
} from '../actions/user-actions.js';
import { filterThreadIDsInFilterList } from '../reducers/calendar-filters-reducer.js';
import {
  cookieSelector,
  deviceTokenSelector,
} from '../selectors/keyserver-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { AuthActionSource } from '../types/account-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { getConfig } from '../utils/config.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';

const AUTH_RETRY_DELAY_MS = 60000;

type KeyserverAuthInputs = {
  +authActionSource: AuthActionSource,
  +setInProgress: boolean => mixed,
  +hasBeenCancelled: () => boolean,
  +doNotRegister: boolean,
};

type RawKeyserverAuthFunc =
  KeyserverAuthInputs => CallKeyserverEndpoint => Promise<void>;

function useRawKeyserverAuth(keyserverID: string): RawKeyserverAuthFunc {
  const navInfo = useSelector(state => state.navInfo);
  const calendarFilters = useSelector(state => state.calendarFilters);
  const calendarQuery = React.useMemo(() => {
    const filters = filterThreadIDsInFilterList(
      calendarFilters,
      (threadID: string) =>
        extractKeyserverIDFromIDOptional(threadID) === keyserverID,
    );
    return {
      startDate: navInfo.startDate,
      endDate: navInfo.endDate,
      filters,
    };
  }, [calendarFilters, keyserverID, navInfo.endDate, navInfo.startDate]);

  const cookie = useSelector(cookieSelector(keyserverID));

  const keyserverDeviceToken = useSelector(deviceTokenSelector(keyserverID));
  // We have an assumption that we should be always connected to the
  // authoritative keyserver. It is possible that a token which it has is
  // correct, so we can try to use it. In worst case it is invalid and our
  // push-handler will try to fix it.
  const authoritativeKeyserverDeviceToken = useSelector(
    deviceTokenSelector(authoritativeKeyserverID()),
  );
  const deviceToken = keyserverDeviceToken ?? authoritativeKeyserverDeviceToken;

  const dispatchActionPromise = useDispatchActionPromise();

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const { olmAPI } = getConfig();

  const currentUserInfo = useSelector(state => state.currentUserInfo);

  return React.useCallback(
    (inputs: KeyserverAuthInputs) =>
      async (innerCallKeyserverEndpoint: CallKeyserverEndpoint) => {
        const {
          authActionSource,
          setInProgress,
          hasBeenCancelled,
          doNotRegister,
        } = inputs;
        try {
          const [keyserverKeys] = await Promise.all([
            identityClient.getKeyserverKeys(keyserverID),
            olmAPI.initializeCryptoAccount(),
          ]);

          if (hasBeenCancelled()) {
            throw new Error(CANCELLED_ERROR);
          }

          const [notifsSession, contentSession, { userID, deviceID }] =
            await Promise.all([
              olmAPI.keyserverNotificationsSessionCreator(
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

          if (hasBeenCancelled()) {
            throw new Error(CANCELLED_ERROR);
          }

          const authPromise = keyserverAuthRawAction(
            innerCallKeyserverEndpoint,
          )({
            userID,
            deviceID,
            doNotRegister,
            calendarQuery,
            deviceTokenUpdateInput,
            authActionSource,
            keyserverData: {
              [keyserverID]: {
                initialContentEncryptedMessage:
                  contentSession.encryptedData.message,
                initialNotificationsEncryptedMessage: notifsSession,
              },
            },
            preRequestUserInfo: currentUserInfo,
          });

          void dispatchActionPromise(keyserverAuthActionTypes, authPromise);
          await authPromise;
        } catch (e) {
          if (hasBeenCancelled()) {
            return;
          }
          console.log(
            `Error while authenticating to keyserver with id ${keyserverID}`,
            e,
          );
          throw e;
        } finally {
          if (!hasBeenCancelled()) {
            void (async () => {
              await sleep(AUTH_RETRY_DELAY_MS);
              setInProgress(false);
            })();
          }
        }
      },
    [
      calendarQuery,
      cookie,
      deviceToken,
      dispatchActionPromise,
      getAuthMetadata,
      identityClient,
      keyserverID,
      olmAPI,
      currentUserInfo,
    ],
  );
}

type KeyserverAuthFunc = KeyserverAuthInputs => Promise<void>;

function useKeyserverAuthWithRetry(keyserverID: string): KeyserverAuthFunc {
  const rawKeyserverAuth = useRawKeyserverAuth(keyserverID);
  const { callKeyserverEndpoint } = useCallKeyserverEndpointContext();
  return React.useCallback(
    async (inputs: KeyserverAuthInputs) => {
      try {
        return await rawKeyserverAuth(inputs)(callKeyserverEndpoint);
      } catch (e) {
        if (getMessageForException(e) === 'olm_session_creation_failure') {
          // We retry in case we were accidentally vended an invalid OTK the
          // first time
          return await rawKeyserverAuth(inputs)(callKeyserverEndpoint);
        }
        throw e;
      }
    },
    [rawKeyserverAuth, callKeyserverEndpoint],
  );
}

export { useRawKeyserverAuth, useKeyserverAuthWithRetry };
