// @flow

import type { AppState } from '../types/redux-types';
import {
  serverRequestTypes,
  type ServerRequest,
  type ClientClientResponse,
  type ClientInconsistencyResponse,
  type ClientThreadInconsistencyClientResponse,
  type ClientEntryInconsistencyClientResponse,
} from '../types/request-types';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { RawThreadInfo } from '../types/thread-types';
import type { SessionState } from '../types/session-types';

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

const queuedInconsistencyReports: (
  state: AppState,
) => $ReadOnlyArray<ClientInconsistencyResponse> = createSelector(
  (state: AppState) => state.threadStore.inconsistencyResponses,
  (state: AppState) => state.entryStore.inconsistencyResponses,
  (
    threadInconsistencyResponses:
      $ReadOnlyArray<ClientThreadInconsistencyClientResponse>,
    entryInconsistencyResponses:
      $ReadOnlyArray<ClientEntryInconsistencyClientResponse>,
  ): $ReadOnlyArray<ClientInconsistencyResponse> => [
    ...threadInconsistencyResponses,
    ...entryInconsistencyResponses,
  ],
);

const getClientResponsesSelector: (
  state: AppState,
) => (
  calendarActive: bool,
  serverRequests: $ReadOnlyArray<ServerRequest>,
) => $ReadOnlyArray<ClientClientResponse> = createSelector(
  (state: AppState) => state.threadStore.threadInfos,
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.currentUserInfo,
  currentCalendarQuery,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    entryInfos: {[id: string]: RawEntryInfo},
    currentUserInfo: ?CurrentUserInfo,
    calendarQuery: (calendarActive: bool) => CalendarQuery,
  ) => (
    calendarActive: bool,
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
          if (key === "threadInfos") {
            hashValue = hash(threadInfos);
          } else if (key === "entryInfos") {
            hashValue = hash(filteredEntryInfos);
          } else if (key === "currentUserInfo") {
            hashValue = hash(currentUserInfo);
          } else if (key.startsWith("threadInfo|")) {
            const [ ignore, threadID ] = key.split('|');
            hashValue = hash(threadInfos[threadID]);
          } else if (key.startsWith("entryInfo|")) {
            const [ ignore, entryID ] = key.split('|');
            let rawEntryInfo = filteredEntryInfos[entryID];
            if (rawEntryInfo) {
              rawEntryInfo = serverEntryInfo(rawEntryInfo);
            }
            hashValue = hash(rawEntryInfo);
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
) => (calendarActive: bool) => SessionState = createSelector(
  (state: AppState) => state.messageStore.currentAsOf,
  (state: AppState) => state.updatesCurrentAsOf,
  currentCalendarQuery,
  (
    messagesCurrentAsOf: number,
    updatesCurrentAsOf: number,
    calendarQuery: (calendarActive: bool) => CalendarQuery,
  ) => (calendarActive: bool): SessionState => ({
    calendarQuery: calendarQuery(calendarActive),
    messagesCurrentAsOf,
    updatesCurrentAsOf,
    watchedIDs: threadWatcher.getWatchedIDs(),
  }),
);

export {
  queuedInconsistencyReports,
  getClientResponsesSelector,
  sessionStateFuncSelector,
};
