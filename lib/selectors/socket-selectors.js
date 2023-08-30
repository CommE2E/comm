// @flow

import { createSelector } from 'reselect';

import {
  updatesCurrentAsOfSelector,
  currentAsOfSelector,
} from './keyserver-selectors.js';
import { currentCalendarQuery } from './nav-selectors.js';
import { serverEntryInfo } from '../shared/entry-utils.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import threadWatcher from '../shared/thread-watcher.js';
import type { SignedIdentityKeysBlob } from '../types/crypto-types.js';
import {
  type RawEntryInfos,
  type CalendarQuery,
} from '../types/entry-types.js';
import type { AppState } from '../types/redux-types.js';
import type { ClientReportCreationRequest } from '../types/report-types.js';
import {
  serverRequestTypes,
  type ClientServerRequest,
  type ClientClientResponse,
} from '../types/request-types.js';
import type { SessionState } from '../types/session-types.js';
import type { OneTimeKeyGenerator } from '../types/socket-types.js';
import { type RawThreadInfos } from '../types/thread-types.js';
import { type CurrentUserInfo, type UserInfos } from '../types/user-types.js';
import { getConfig } from '../utils/config.js';
import { minimumOneTimeKeysRequired } from '../utils/crypto-utils.js';
import { hash } from '../utils/objects.js';

const queuedReports: (
  state: AppState,
) => $ReadOnlyArray<ClientReportCreationRequest> = createSelector(
  (state: AppState) => state.reportStore.queuedReports,
  (
    mainQueuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  ): $ReadOnlyArray<ClientReportCreationRequest> => mainQueuedReports,
);

const getClientResponsesSelector: (
  state: AppState,
) => (
  calendarActive: boolean,
  oneTimeKeyGenerator: ?OneTimeKeyGenerator,
  getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob>,
  getInitialNotificationsEncryptedMessage: ?() => Promise<string>,
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  (state: AppState) => state.threadStore.threadInfos,
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.userStore.userInfos,
  (state: AppState) => state.currentUserInfo,
  currentCalendarQuery,
  (
    threadInfos: RawThreadInfos,
    entryInfos: RawEntryInfos,
    userInfos: UserInfos,
    currentUserInfo: ?CurrentUserInfo,
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
  ) => {
    return async (
      calendarActive: boolean,
      oneTimeKeyGenerator: ?OneTimeKeyGenerator,
      getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob>,
      getInitialNotificationsEncryptedMessage: ?() => Promise<string>,
      serverRequests: $ReadOnlyArray<ClientServerRequest>,
    ): Promise<$ReadOnlyArray<ClientClientResponse>> => {
      const clientResponses = [];
      const serverRequestedPlatformDetails = serverRequests.some(
        request => request.type === serverRequestTypes.PLATFORM_DETAILS,
      );
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

          const convertedInfos = {
            [stateSyncSpecs.entries.hashKey]:
              stateSyncSpecs.entries.convertClientToServerInfos(
                entryInfos,
                query,
              ),
            [stateSyncSpecs.threads.hashKey]:
              stateSyncSpecs.threads.convertClientToServerInfos(
                threadInfos,
                query,
              ),
            [stateSyncSpecs.users.hashKey]:
              stateSyncSpecs.users.convertClientToServerInfos(userInfos, query),
            [stateSyncSpecs.currentUser.hashKey]: currentUserInfo
              ? stateSyncSpecs.currentUser.convertClientToServerInfos(
                  currentUserInfo,
                  query,
                )
              : currentUserInfo,
          };

          const hashResults = {};
          for (const key in serverRequest.hashesToCheck) {
            const expectedHashValue = serverRequest.hashesToCheck[key];
            let hashValue;
            if (convertedInfos[key]) {
              hashValue = hash(convertedInfos[key]);
            } else if (key.startsWith('threadInfo|')) {
              const [, threadID] = key.split('|');
              hashValue = hash(
                convertedInfos[stateSyncSpecs.threads.hashKey][threadID],
              );
            } else if (key.startsWith('entryInfo|')) {
              const [, entryID] = key.split('|');
              let rawEntryInfo =
                convertedInfos[stateSyncSpecs.entries.hashKey][entryID];
              if (rawEntryInfo) {
                rawEntryInfo = serverEntryInfo(rawEntryInfo);
              }
              hashValue = hash(rawEntryInfo);
            } else if (key.startsWith('userInfo|')) {
              const [, userID] = key.split('|');
              hashValue = hash(
                convertedInfos[stateSyncSpecs.users.hashKey][userID],
              );
            } else {
              continue;
            }
            hashResults[key] = expectedHashValue === hashValue;
          }

          const { failUnmentioned } = serverRequest;
          if (failUnmentioned && failUnmentioned.threadInfos) {
            for (const threadID in convertedInfos[
              stateSyncSpecs.threads.hashKey
            ]) {
              const key = `threadInfo|${threadID}`;
              const hashResult = hashResults[key];
              if (hashResult === null || hashResult === undefined) {
                hashResults[key] = false;
              }
            }
          }
          if (failUnmentioned && failUnmentioned.entryInfos) {
            for (const entryID in convertedInfos[
              stateSyncSpecs.entries.hashKey
            ]) {
              const key = `entryInfo|${entryID}`;
              const hashResult = hashResults[key];
              if (hashResult === null || hashResult === undefined) {
                hashResults[key] = false;
              }
            }
          }
          if (failUnmentioned && failUnmentioned.userInfos) {
            for (const userID in convertedInfos[stateSyncSpecs.users.hashKey]) {
              const key = `userInfo|${userID}`;
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
          serverRequest.type === serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB &&
          getSignedIdentityKeysBlob
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
            await getInitialNotificationsEncryptedMessage();
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

const sessionStateFuncSelector: (
  state: AppState,
) => (calendarActive: boolean) => SessionState = createSelector(
  currentAsOfSelector,
  updatesCurrentAsOfSelector,
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

export { queuedReports, getClientResponsesSelector, sessionStateFuncSelector };
