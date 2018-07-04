// @flow

import type { BaseAppState } from '../types/redux-types';
import type { CalendarQuery, RawEntryInfo } from '../types/entry-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { PingStartingPayload, PingActionInput } from '../types/ping-types';
import type { RawThreadInfo } from '../types/thread-types';
import {
  serverRequestTypes,
  type ServerRequest,
  type ThreadPollPushInconsistencyClientResponse,
} from '../types/request-types';

import { createSelector } from 'reselect';

import { nextSessionID } from './session-selectors';
import { currentCalendarQuery } from './nav-selectors';
import { getConfig } from '../utils/config';

const pingStartingPayload = createSelector(
  (state: BaseAppState<*>) => !!(state.currentUserInfo &&
    !state.currentUserInfo.anonymous && true),
  nextSessionID,
  currentCalendarQuery,
  (
    loggedIn: bool,
    nextSessionID: () => ?string,
    currentCalendarQuery: () => CalendarQuery,
  ): () => PingStartingPayload => {
    return () => {
      const calendarQuery = currentCalendarQuery();
      const sessionID = nextSessionID();
      const time = Date.now();
      if (sessionID) {
        return { loggedIn, calendarQuery, time, newSessionID: sessionID };
      } else {
        return { loggedIn, calendarQuery, time };
      }
    };
  },
);

let initialPlatformDetailsSentAsOf = null;
// This gets generated and passed in to the action function, which then passes
// it on in the PING_SUCCESS payload
const pingActionInput = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (state: BaseAppState<*>) => state.currentUserInfo,
  (state: BaseAppState<*>) => state.messageStore.currentAsOf,
  (state: BaseAppState<*>) => state.updatesCurrentAsOf,
  (state: BaseAppState<*>) => state.activeServerRequests,
  (state: BaseAppState<*>) => state.deviceToken,
  (state: BaseAppState<*>) => state.threadStore.inconsistencyResponses,
  (state: BaseAppState<*>) => state.pingTimestamps.lastSuccess,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    entryInfos: {[id: string]: RawEntryInfo},
    currentUserInfo: ?CurrentUserInfo,
    messagesCurrentAsOf: number,
    updatesCurrentAsOf: number,
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
    deviceToken: ?string,
    inconsistencyResponses:
      $ReadOnlyArray<ThreadPollPushInconsistencyClientResponse>,
    lastSuccess: number,
  ): (startingPayload: PingStartingPayload) => PingActionInput => {
    const clientResponses = [...inconsistencyResponses];
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
