// @flow

import type { BaseAppState } from '../types/redux-types';
import type { CalendarQuery, RawEntryInfo } from '../types/entry-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { PingStartingPayload, PingActionInput } from '../types/ping-types';
import type { RawThreadInfo } from '../types/thread-types';

import { createSelector } from 'reselect';

import { nextSessionID } from './session-selectors';
import { currentCalendarQuery } from './nav-selectors';

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
      if (sessionID) {
        return { loggedIn, calendarQuery, newSessionID: sessionID };
      } else {
        return { loggedIn, calendarQuery };
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
  (state: BaseAppState<*>) => state.currentAsOf,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    entryInfos: {[id: string]: RawEntryInfo},
    currentUserInfo: ?CurrentUserInfo,
    currentAsOf: number,
  ): (startingPayload: PingStartingPayload) => PingActionInput => {
    return (startingPayload: PingStartingPayload) => ({
      loggedIn: startingPayload.loggedIn,
      calendarQuery: startingPayload.calendarQuery,
      currentAsOf,
      prevState: {
        threadInfos,
        entryInfos,
        currentUserInfo,
      },
    });
  },
);

export {
  pingStartingPayload,
  pingActionInput,
};
