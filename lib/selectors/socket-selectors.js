// @flow

import type { AppState } from '../types/redux-types';
import {
  serverRequestTypes,
  type ServerRequest,
  type ClientClientResponse,
} from '../types/request-types';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types';
import type { CurrentUserInfo, UserInfo } from '../types/user-types';
import type { RawThreadInfo } from '../types/thread-types';
import type { SessionState } from '../types/session-types';
import type {
  ClientThreadInconsistencyReportCreationRequest,
  ClientEntryInconsistencyReportCreationRequest,
  ClientReportCreationRequest,
} from '../types/report-types';

import { createSelector } from 'reselect';

import { getConfig } from '../utils/config';
import {
  serverEntryInfo,
  serverEntryInfosObject,
  filterRawEntryInfosByCalendarQuery,
} from '../shared/entry-utils';
import { values, hash } from '../utils/objects';
import { currentCalendarQuery } from './nav-selectors';
import threadWatcher from '../shared/thread-watcher';

const queuedReports: (
  state: AppState,
) => $ReadOnlyArray<ClientReportCreationRequest> = createSelector(
  (state: AppState) => state.threadStore.inconsistencyReports,
  (state: AppState) => state.entryStore.inconsistencyReports,
  (state: AppState) => state.queuedReports,
  (
    threadInconsistencyReports: $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
    entryInconsistencyReports: $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>,
    mainQueuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  ): $ReadOnlyArray<ClientReportCreationRequest> => [
    ...threadInconsistencyReports,
    ...entryInconsistencyReports,
    ...mainQueuedReports,
  ],
);

const getClientResponsesSelector: (
  state: AppState,
) => (
  calendarActive: boolean,
  serverRequests: $ReadOnlyArray<ServerRequest>,
) => $ReadOnlyArray<ClientClientResponse> = createSelector(
  (state: AppState) => state.threadStore.threadInfos,
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.userStore.userInfos,
  (state: AppState) => state.currentUserInfo,
  currentCalendarQuery,
  (
    threadInfos: { [id: string]: RawThreadInfo },
    entryInfos: { [id: string]: RawEntryInfo },
    userInfos: { [id: string]: UserInfo },
    currentUserInfo: ?CurrentUserInfo,
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
  ) => (
    calendarActive: boolean,
    serverRequests: $ReadOnlyArray<ServerRequest>,
  ): $ReadOnlyArray<ClientClientResponse> => {
    const clientResponses = [];
    const serverRequestedPlatformDetails = serverRequests.some(
      request => request.type === serverRequestTypes.PLATFORM_DETAILS,
    );
    for (let serverRequest of serverRequests) {
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
        for (let key in serverRequest.hashesToCheck) {
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
          for (let threadID in threadInfos) {
            const key = `threadInfo|${threadID}`;
            const hashResult = hashResults[key];
            if (hashResult === null || hashResult === undefined) {
              hashResults[key] = false;
            }
          }
        }
        if (failUnmentioned && failUnmentioned.entryInfos) {
          for (let entryID in filteredEntryInfos) {
            const key = `entryInfo|${entryID}`;
            const hashResult = hashResults[key];
            if (hashResult === null || hashResult === undefined) {
              hashResults[key] = false;
            }
          }
        }
        if (failUnmentioned && failUnmentioned.userInfos) {
          for (let userID in userInfos) {
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
  ) => (calendarActive: boolean): SessionState => ({
    calendarQuery: calendarQuery(calendarActive),
    messagesCurrentAsOf,
    updatesCurrentAsOf,
    watchedIDs: threadWatcher.getWatchedIDs(),
  }),
);

export { queuedReports, getClientResponsesSelector, sessionStateFuncSelector };
