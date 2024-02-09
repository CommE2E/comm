// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  updatesCurrentAsOfSelector,
  currentAsOfSelector,
  urlPrefixSelector,
  cookieSelector,
} from './keyserver-selectors.js';
import { currentCalendarQuery } from './nav-selectors.js';
import { createOpenSocketFunction } from '../shared/socket-utils.js';
import type { BoundStateSyncSpec } from '../shared/state-sync/state-sync-spec.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import threadWatcher from '../shared/thread-watcher.js';
import type { SignedIdentityKeysBlob } from '../types/crypto-types.js';
import { type CalendarQuery } from '../types/entry-types.js';
import type { AppState } from '../types/redux-types.js';
import type { ClientReportCreationRequest } from '../types/report-types.js';
import {
  serverRequestTypes,
  type ClientServerRequest,
  type ClientClientResponse,
} from '../types/request-types.js';
import type { SessionState } from '../types/session-types.js';
import type { OneTimeKeyGenerator } from '../types/socket-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { getConfig } from '../utils/config.js';
import { minimumOneTimeKeysRequired } from '../utils/crypto-utils.js';
import { values } from '../utils/objects.js';

const baseOpenSocketSelector: (
  keyserverID: string,
) => (state: AppState) => ?() => WebSocket = keyserverID =>
  createSelector(
    urlPrefixSelector(keyserverID),
    // We don't actually use the cookie in the socket open function,
    // but we do use it in the initial message, and when the cookie changes
    // the socket needs to be reopened. By including the cookie here,
    // whenever the cookie changes this function will change,
    // which tells the Socket component to restart the connection.
    cookieSelector(keyserverID),
    (urlPrefix: ?string) => {
      if (!urlPrefix) {
        return null;
      }
      return createOpenSocketFunction(urlPrefix);
    },
  );

const openSocketSelector: (
  keyserverID: string,
) => (state: AppState) => ?() => WebSocket = _memoize(baseOpenSocketSelector);

const queuedReports: (
  state: AppState,
) => $ReadOnlyArray<ClientReportCreationRequest> = createSelector(
  (state: AppState) => state.reportStore.queuedReports,
  (
    mainQueuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  ): $ReadOnlyArray<ClientReportCreationRequest> => mainQueuedReports,
);

// We pass all selectors specified in stateSyncSpecs and get the resulting
// BoundStateSyncSpecs in the specs array. We do it so we don't have to
// modify the selector when we add a new spec.
type BoundStateSyncSpecs = {
  +specsPerHashKey: { +[string]: BoundStateSyncSpec<mixed, mixed, mixed> },
  +specPerInnerHashKey: { +[string]: BoundStateSyncSpec<mixed, mixed, mixed> },
};
const stateSyncSpecSelectors = values(stateSyncSpecs).map(
  spec => spec.selector,
);
const boundStateSyncSpecsSelector: AppState => BoundStateSyncSpecs =
  // The FlowFixMe is needed because createSelector types require flow
  // to know the number of subselectors at compile time.
  // $FlowFixMe
  createSelector(stateSyncSpecSelectors, (...specs) => {
    const boundSpecs = (specs: BoundStateSyncSpec<mixed, mixed, mixed>[]);
    // We create a map from `hashKey` to a given spec for easier lookup later
    const specsPerHashKey = Object.fromEntries(
      boundSpecs.map(spec => [spec.hashKey, spec]),
    );

    // We do the same for innerHashKey
    const specPerInnerHashKey = Object.fromEntries(
      boundSpecs
        .filter(spec => spec.innerHashSpec?.hashKey)
        .map(spec => [spec.innerHashSpec?.hashKey, spec]),
    );

    return { specsPerHashKey, specPerInnerHashKey };
  });

const getClientResponsesSelector: (
  state: AppState,
) => (
  calendarActive: boolean,
  oneTimeKeyGenerator: ?OneTimeKeyGenerator,
  getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
  getInitialNotificationsEncryptedMessage: ?(
    keyserverID: string,
  ) => Promise<string>,
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  boundStateSyncSpecsSelector,
  currentCalendarQuery,
  (
    boundStateSyncSpecs: BoundStateSyncSpecs,
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
  ) => {
    return async (
      calendarActive: boolean,
      oneTimeKeyGenerator: ?OneTimeKeyGenerator,
      getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
      getInitialNotificationsEncryptedMessage: ?(
        keyserverID: string,
      ) => Promise<string>,
      serverRequests: $ReadOnlyArray<ClientServerRequest>,
    ): Promise<$ReadOnlyArray<ClientClientResponse>> => {
      const clientResponses = [];
      const serverRequestedPlatformDetails = serverRequests.some(
        request => request.type === serverRequestTypes.PLATFORM_DETAILS,
      );
      const { specsPerHashKey, specPerInnerHashKey } = boundStateSyncSpecs;
      for (const serverRequest of serverRequests) {
        if (
          serverRequest.type === serverRequestTypes.PLATFORM &&
          !serverRequestedPlatformDetails
        ) {
          clientResponses.push({
            type: serverRequestTypes.PLATFORM,
            platform: getConfig().platformDetails.platform,
          });
        } else if (serverRequest.type === serverRequestTypes.PLATFORM_DETAILS) {
          clientResponses.push({
            type: serverRequestTypes.PLATFORM_DETAILS,
            platformDetails: getConfig().platformDetails,
          });
        } else if (serverRequest.type === serverRequestTypes.CHECK_STATE) {
          const query = calendarQuery(calendarActive);

          const hashResults: { [string]: boolean } = {};
          for (const key in serverRequest.hashesToCheck) {
            const expectedHashValue = serverRequest.hashesToCheck[key];
            let hashValue;
            const [specKey, id] = key.split('|');
            if (id) {
              hashValue = specPerInnerHashKey[specKey]?.getInfoHash(id);
            } else {
              hashValue = specsPerHashKey[specKey]?.getAllInfosHash(query);
            }

            // If hashValue values is null then we are still calculating
            // the hashes in the background. In this case we return true
            // to skip this state check. Future state checks (after the hash
            // calculation complete) will be handled normally.
            if (!hashValue) {
              hashResults[key] = true;
            } else {
              hashResults[key] = expectedHashValue === hashValue;
            }
          }

          const { failUnmentioned } = serverRequest;
          for (const spec of values(specPerInnerHashKey)) {
            const innerHashKey = spec.innerHashSpec?.hashKey;
            if (!failUnmentioned?.[spec.hashKey] || !innerHashKey) {
              continue;
            }

            const ids = spec.getIDs(query);
            if (!ids) {
              continue;
            }

            for (const id of ids) {
              const key = `${innerHashKey}|${id}`;
              const hashResult = hashResults[key];
              if (hashResult === null || hashResult === undefined) {
                hashResults[key] = false;
              }
            }
          }

          clientResponses.push({
            type: serverRequestTypes.CHECK_STATE,
            hashResults,
          });
        } else if (
          serverRequest.type === serverRequestTypes.MORE_ONE_TIME_KEYS &&
          oneTimeKeyGenerator
        ) {
          const keys: string[] = [];
          for (let i = 0; i < minimumOneTimeKeysRequired; ++i) {
            keys.push(oneTimeKeyGenerator(i));
          }
          clientResponses.push({
            type: serverRequestTypes.MORE_ONE_TIME_KEYS,
            keys,
          });
        } else if (
          serverRequest.type === serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB
        ) {
          const signedIdentityKeysBlob = await getSignedIdentityKeysBlob();
          clientResponses.push({
            type: serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB,
            signedIdentityKeysBlob,
          });
        } else if (
          serverRequest.type ===
            serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE &&
          getInitialNotificationsEncryptedMessage
        ) {
          const initialNotificationsEncryptedMessage =
            await getInitialNotificationsEncryptedMessage(
              authoritativeKeyserverID,
            );
          clientResponses.push({
            type: serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE,
            initialNotificationsEncryptedMessage,
          });
        }
      }
      return clientResponses;
    };
  },
);

const baseSessionStateFuncSelector: (
  keyserverID: string,
) => (
  state: AppState,
) => (calendarActive: boolean) => SessionState = keyserverID =>
  createSelector(
    currentAsOfSelector(keyserverID),
    updatesCurrentAsOfSelector(keyserverID),
    currentCalendarQuery,
    (
      messagesCurrentAsOf: number,
      updatesCurrentAsOf: number,
      calendarQuery: (calendarActive: boolean) => CalendarQuery,
    ) =>
      (calendarActive: boolean): SessionState => ({
        calendarQuery: calendarQuery(calendarActive),
        messagesCurrentAsOf,
        updatesCurrentAsOf,
        watchedIDs: threadWatcher.getWatchedIDs(),
      }),
  );

const sessionStateFuncSelector: (
  keyserverID: string,
) => (state: AppState) => (calendarActive: boolean) => SessionState = _memoize(
  baseSessionStateFuncSelector,
);

export {
  openSocketSelector,
  queuedReports,
  getClientResponsesSelector,
  sessionStateFuncSelector,
};
