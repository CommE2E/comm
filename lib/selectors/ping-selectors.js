// @flow

import type { BaseAppState } from '../types/redux-types';
import type { CalendarQuery } from './nav-selectors';

import { createSelector } from 'reselect';

import { nextSessionID } from './session-selectors';
import { currentCalendarQuery } from './nav-selectors';

export type PingStartingPayload = {
  calendarQuery: CalendarQuery,
  newSessionID?: string,
};
const pingStartingPayload = createSelector(
  nextSessionID,
  currentCalendarQuery,
  (nextSessionID: () => ?string, currentCalendarQuery: () => CalendarQuery) => {
    return () => {
      const calendarQuery = currentCalendarQuery();
      const sessionID = nextSessionID();
      if (sessionID) {
        return { calendarQuery, newSessionID: sessionID };
      } else {
        return { calendarQuery };
      }
    };
  },
);

export {
  pingStartingPayload,
};
