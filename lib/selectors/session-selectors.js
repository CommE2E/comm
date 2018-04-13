// @flow

import type { BaseAppState } from '../types/redux-types';

import { createSelector } from 'reselect';
import invariant from 'invariant';

function newSessionID(): string {
  return Math.floor(0x80000000 * Math.random()).toString(36);
}

const sessionInactivityLimit = 15 * 60 * 1000;
const sessionTimeLeft = createSelector(
  (state: BaseAppState<*>) => state.lastUserInteraction.sessionReset,
  (lastUserInteractionSessionReset: ?number) => {
    const lastUserInteractionSessionReset2 = lastUserInteractionSessionReset;
    invariant(
      lastUserInteractionSessionReset2 !== undefined &&
        lastUserInteractionSessionReset2 !== null,
      "sessionReset should have a lastUserInteraction entry",
    );
    // Return a function since we depend on the time of evaluation
    return () =>
      sessionInactivityLimit - Date.now() + lastUserInteractionSessionReset2;
  },
);

const sessionExpired = createSelector(
  sessionTimeLeft,
  (timeLeft: () => number) => {
    return () => timeLeft() < 0;
  },
);

let cachedNextSessionID: ?string = null;
const currentSessionID = createSelector(
  (state: BaseAppState<*>) => state.sessionID,
  sessionExpired,
  (sessionID: string, sessionExpired: () => bool) => {
    // Return a function since we depend on the time of evaluation
    return (): string => {
      if (!sessionExpired()) {
        return sessionID;
      }
      if (!cachedNextSessionID || cachedNextSessionID === sessionID) {
        cachedNextSessionID = newSessionID();
      }
      return cachedNextSessionID;
    };
  },
);

// Returns null if the session isn't expired
const nextSessionID = createSelector(
  (state: BaseAppState<*>) => state.sessionID,
  sessionExpired,
  (sessionID: string, sessionExpired: () => bool) => {
    // Return a function since we depend on the time of evaluation
    return (): ?string => {
      if (!sessionExpired()) {
        return null;
      }
      if (!cachedNextSessionID || cachedNextSessionID === sessionID) {
        cachedNextSessionID = newSessionID();
      }
      return cachedNextSessionID;
    };
  },
);

const sessionStartingPayload = createSelector(
  nextSessionID,
  (nextSessionID: () => ?string) => {
    return () => {
      const sessionID = nextSessionID();
      if (sessionID) {
        return { newSessionID: sessionID };
      } else {
        return {};
      }
    };
  },
);

export {
  sessionTimeLeft,
  sessionExpired,
  newSessionID,
  sessionInactivityLimit,
  currentSessionID,
  nextSessionID,
  sessionStartingPayload,
};
