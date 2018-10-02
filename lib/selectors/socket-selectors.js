// @flow

import type { AppState } from '../types/redux-types';
import {
  serverRequestTypes,
  type ServerRequest,
  type ClientResponse,
  type ThreadInconsistencyClientResponse,
  type EntryInconsistencyClientResponse,
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

const clientResponsesSelector = createSelector(
  (state: AppState) => state.activeServerRequests,
  (state: AppState) => state.threadStore.inconsistencyResponses,
  (state: AppState) => state.entryStore.inconsistencyResponses,
  (state: AppState) => state.threadStore.threadInfos,
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.currentUserInfo,
  (state: AppState) => state.deviceToken,
  currentCalendarQuery,
  (
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
    threadInconsistencyResponses:
      $ReadOnlyArray<ThreadInconsistencyClientResponse>,
    entryInconsistencyResponses:
      $ReadOnlyArray<EntryInconsistencyClientResponse>,
    threadInfos: {[id: string]: RawThreadInfo},
    entryInfos: {[id: string]: RawEntryInfo},
    currentUserInfo: ?CurrentUserInfo,
    deviceToken: ?string,
    calendarQuery: () => CalendarQuery,
  ): $ReadOnlyArray<ClientResponse> => {
    const clientResponses = [
      ...threadInconsistencyResponses,
      ...entryInconsistencyResponses,
    ];
    const serverRequestedPlatformDetails = activeServerRequests.some(
      request => request.type === serverRequestTypes.PLATFORM_DETAILS,
    );
    for (let serverRequest of activeServerRequests) {
      if (
        serverRequest.type === serverRequestTypes.PLATFORM &&
        !serverRequestedPlatformDetails
      ) {
        clientResponses.push({
          type: serverRequestTypes.PLATFORM,
          platform: getConfig().platformDetails.platform,
        });
      } else if (
        serverRequest.type === serverRequestTypes.DEVICE_TOKEN &&
        deviceToken !== null && deviceToken !== undefined
      ) {
        clientResponses.push({
          type: serverRequestTypes.DEVICE_TOKEN,
          deviceToken,
        });
      } else if (serverRequest.type === serverRequestTypes.PLATFORM_DETAILS) {
        clientResponses.push({
          type: serverRequestTypes.PLATFORM_DETAILS,
          platformDetails: getConfig().platformDetails,
        });
      } else if (serverRequest.type === serverRequestTypes.CHECK_STATE) {
        const hashResults = {};
        for (let key in serverRequest.hashesToCheck) {
          const expectedHashValue = serverRequest.hashesToCheck[key];
          let hashValue;
          if (key === "threadInfos") {
            hashValue = hash(threadInfos);
          } else if (key === "entryInfos") {
            const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
              serverEntryInfosObject(values(entryInfos)),
              calendarQuery(),
            );
            hashValue = hash(filteredEntryInfos);
          } else if (key === "currentUserInfo") {
            hashValue = hash(currentUserInfo);
          } else if (key.startsWith("threadInfo|")) {
            const [ ignore, threadID ] = key.split('|');
            hashValue = hash(threadInfos[threadID]);
          } else if (key.startsWith("entryInfo|")) {
            const [ ignore, entryID ] = key.split('|');
            let rawEntryInfo = entryInfos[entryID];
            if (rawEntryInfo) {
              rawEntryInfo = serverEntryInfo(rawEntryInfo);
            }
            hashValue = hash(rawEntryInfo);
          }
          hashResults[key] = expectedHashValue === hashValue;
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

const sessionStateFuncSelector = createSelector(
  (state: AppState) => state.messageStore.currentAsOf,
  (state: AppState) => state.updatesCurrentAsOf,
  currentCalendarQuery,
  (
    messagesCurrentAsOf: number,
    updatesCurrentAsOf: number,
    calendarQuery: () => CalendarQuery,
  ): () => SessionState => () => ({
    calendarQuery: calendarQuery(),
    messagesCurrentAsOf,
    updatesCurrentAsOf,
    watchedIDs: threadWatcher.getWatchedIDs(),
  }),
);

export {
  clientResponsesSelector,
  sessionStateFuncSelector,
};
