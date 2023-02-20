// @flow

import { createSelector } from 'reselect';

import { currentCalendarQuery } from './nav-selectors.js';
import {
  serverEntryInfo,
  serverEntryInfosObject,
  filterRawEntryInfosByCalendarQuery,
} from '../shared/entry-utils.js';
import threadWatcher from '../shared/thread-watcher.js';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types.js';
import type { AppState } from '../types/redux-types.js';
import type { ClientReportCreationRequest } from '../types/report-types.js';
import {
  serverRequestTypes,
  type ClientServerRequest,
  type ClientClientResponse,
} from '../types/request-types.js';
import type { SessionState } from '../types/session-types.js';
import type { OneTimeKeyGenerator } from '../types/socket-types.js';
import type { RawThreadInfo } from '../types/thread-types.js';
import type { CurrentUserInfo, UserInfos } from '../types/user-types.js';
import { getConfig } from '../utils/config.js';
import { minimumOneTimeKeysRequired } from '../utils/crypto-utils.js';
import { values, hash } from '../utils/objects.js';

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
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => $ReadOnlyArray<ClientClientResponse> = createSelector(
  (state: AppState) => state.threadStore.threadInfos,
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.userStore.userInfos,
  (state: AppState) => state.currentUserInfo,
  currentCalendarQuery,
  (
      threadInfos: { +[id: string]: RawThreadInfo },
      entryInfos: { +[id: string]: RawEntryInfo },
      userInfos: UserInfos,
      currentUserInfo: ?CurrentUserInfo,
      calendarQuery: (calendarActive: boolean) => CalendarQuery,
    ) =>
    (
      calendarActive: boolean,
      oneTimeKeyGenerator: ?OneTimeKeyGenerator,
      serverRequests: $ReadOnlyArray<ClientServerRequest>,
    ): $ReadOnlyArray<ClientClientResponse> => {
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
          const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
            serverEntryInfosObject(values(entryInfos)),
            calendarQuery(calendarActive),
          );
          const hashResults = {};
          for (const key in serverRequest.hashesToCheck) {
            const expectedHashValue = serverRequest.hashesToCheck[key];
            let hashValue;
            if (key === 'threadInfos') {
              hashValue = hash(threadInfos);
            } else if (key === 'entryInfos') {
              hashValue = hash(filteredEntryInfos);
            } else if (key === 'userInfos') {
              hashValue = hash(userInfos);
            } else if (key === 'currentUserInfo') {
              hashValue = hash(currentUserInfo);
            } else if (key.startsWith('threadInfo|')) {
              const [, threadID] = key.split('|');
              hashValue = hash(threadInfos[threadID]);
            } else if (key.startsWith('entryInfo|')) {
              const [, entryID] = key.split('|');
              let rawEntryInfo = filteredEntryInfos[entryID];
              if (rawEntryInfo) {
                rawEntryInfo = serverEntryInfo(rawEntryInfo);
              }
              hashValue = hash(rawEntryInfo);
            } else if (key.startsWith('userInfo|')) {
              const [, userID] = key.split('|');
              hashValue = hash(userInfos[userID]);
            } else {
              continue;
            }
            hashResults[key] = expectedHashValue === hashValue;
          }

          const { failUnmentioned } = serverRequest;
          if (failUnmentioned && failUnmentioned.threadInfos) {
            for (const threadID in threadInfos) {
              const key = `threadInfo|${threadID}`;
              const hashResult = hashResults[key];
              if (hashResult === null || hashResult === undefined) {
                hashResults[key] = false;
              }
            }
          }
          if (failUnmentioned && failUnmentioned.entryInfos) {
            for (const entryID in filteredEntryInfos) {
              const key = `entryInfo|${entryID}`;
              const hashResult = hashResults[key];
              if (hashResult === null || hashResult === undefined) {
                hashResults[key] = false;
              }
            }
          }
          if (failUnmentioned && failUnmentioned.userInfos) {
            for (const userID in userInfos) {
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
        }
      }
      return clientResponses;
    },
);

const sessionStateFuncSelector: (
  state: AppState,
) => (calendarActive: boolean) => SessionState = createSelector(
  (state: AppState) => state.messageStore.currentAsOf,
  (state: AppState) => state.updatesCurrentAsOf,
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
