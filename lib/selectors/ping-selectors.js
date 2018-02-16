// @flow

import type { BaseAppState } from '../types/redux-types';
import type { CalendarQuery } from '../types/entry-types';

import { createSelector } from 'reselect';

import { nextSessionID } from './session-selectors';
import { currentCalendarQuery } from './nav-selectors';

const pingStartingPayload = createSelector(
  (state: BaseAppState) => !!(state.currentUserInfo &&
    !state.currentUserInfo.anonymous && true),
  nextSessionID,
  currentCalendarQuery,
  (
    loggedIn: bool,
    nextSessionID: () => ?string,
    currentCalendarQuery: () => CalendarQuery,
  ) => {
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

export {
  pingStartingPayload,
};
