// @flow

import type { BaseAppState } from '../types/redux-types';
import type { CalendarQuery, RawEntryInfo } from '../types/entry-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { PingStartingPayload, PingActionInput } from '../types/ping-types';
import type { RawThreadInfo } from '../types/thread-types';
import { serverRequestTypes, type ServerRequest } from '../types/request-types';

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

// This gets generated and passed in to the action function, which then passes
// it on in the PING_SUCCESS payload
const pingActionInput = createSelector(
  (state: BaseAppState<*>) => state.threadInfos,
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (state: BaseAppState<*>) => state.currentUserInfo,
  (state: BaseAppState<*>) => state.messageStore.currentAsOf,
  (state: BaseAppState<*>) => state.updatesCurrentAsOf,
  (state: BaseAppState<*>) => state.activeServerRequests,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    entryInfos: {[id: string]: RawEntryInfo},
    currentUserInfo: ?CurrentUserInfo,
    messagesCurrentAsOf: number,
    updatesCurrentAsOf: number,
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
  ): (startingPayload: PingStartingPayload) => PingActionInput => {
    const clientResponses = [];
    for (let serverRequest of activeServerRequests) {
      if (serverRequest.type === serverRequestTypes.PLATFORM) {
        clientResponses.push({
          type: serverRequestTypes.PLATFORM,
          platform: getConfig().platform,
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
