// @flow

import type { AppState } from '../types/redux-types';
import type { CalendarQuery, RawEntryInfo } from '../types/entry-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { PingStartingPayload, PingActionInput } from '../types/ping-types';
import type { RawThreadInfo } from '../types/thread-types';
import {
  serverRequestTypes,
  type ServerRequest,
  type ThreadPollPushInconsistencyClientResponse,
  type EntryPollPushInconsistencyClientResponse,
} from '../types/request-types';

import { createSelector } from 'reselect';

import { currentCalendarQuery } from './nav-selectors';
import { getConfig } from '../utils/config';

const pingStartingPayload = createSelector(
  (state: AppState) => !!(state.currentUserInfo &&
    !state.currentUserInfo.anonymous && true),
  currentCalendarQuery,
  (
    loggedIn: bool,
    currentCalendarQuery: () => CalendarQuery,
  ): () => PingStartingPayload => {
    return () => {
      const calendarQuery = currentCalendarQuery();
      const time = Date.now();
      return { loggedIn, calendarQuery, time };
    };
  },
);

let initialPlatformDetailsSentAsOf = null;
// This gets generated and passed in to the action function, which then passes
// it on in the PING_SUCCESS payload
const pingActionInput = createSelector(
  (state: AppState) => state.threadStore.threadInfos,
  (state: AppState) => state.entryStore.entryInfos,
  (state: AppState) => state.currentUserInfo,
  (state: AppState) => state.messageStore.currentAsOf,
  (state: AppState) => state.updatesCurrentAsOf,
  (state: AppState) => state.activeServerRequests,
  (state: AppState) => state.deviceToken,
  (state: AppState) => state.threadStore.inconsistencyResponses,
  (state: AppState) => state.entryStore.inconsistencyResponses,
  (state: AppState) => state.pingTimestamps.lastSuccess,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    entryInfos: {[id: string]: RawEntryInfo},
    currentUserInfo: ?CurrentUserInfo,
    messagesCurrentAsOf: number,
    updatesCurrentAsOf: number,
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
    deviceToken: ?string,
    threadInconsistencyResponses:
      $ReadOnlyArray<ThreadPollPushInconsistencyClientResponse>,
    entryInconsistencyResponses:
      $ReadOnlyArray<EntryPollPushInconsistencyClientResponse>,
    lastSuccess: number,
  ): (startingPayload: PingStartingPayload) => PingActionInput => {
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
      }
    }
    // Whenever the app starts up, it's possible that the version has updated.
    // We always communicate the PlatformDetails in that case.
    if (
      initialPlatformDetailsSentAsOf === null ||
      initialPlatformDetailsSentAsOf === lastSuccess
    ) {
      initialPlatformDetailsSentAsOf = lastSuccess;
      if (!serverRequestedPlatformDetails) {
        clientResponses.push({
          type: serverRequestTypes.PLATFORM_DETAILS,
          platformDetails: getConfig().platformDetails,
        });
      }
    }
    return (startingPayload: PingStartingPayload) => ({
      loggedIn: startingPayload.loggedIn,
      calendarQuery: startingPayload.calendarQuery,
      messagesCurrentAsOf,
      updatesCurrentAsOf,
      prevState: {
        threadInfos,
        entryInfos,
        currentUserInfo,
      },
      clientResponses,
    });
  },
);

export {
  pingStartingPayload,
  pingActionInput,
};
