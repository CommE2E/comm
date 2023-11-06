// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  cookieSelector,
  sessionIDSelector,
  deviceTokensSelector,
} from './keyserver-selectors.js';
import { currentCalendarQuery } from './nav-selectors.js';
import type { LogInExtraInfo } from '../types/account-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { KeyserverInfos } from '../types/keyserver-types.js';
import type { AppState } from '../types/redux-types.js';
import type {
  PreRequestUserState,
  PreRequestUserKeyserverSessionInfo,
} from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

const logInExtraInfoSelector: (
  state: AppState,
) => (calendarActive: boolean) => LogInExtraInfo = createSelector(
  deviceTokensSelector,
  currentCalendarQuery,
  (
    deviceTokens: { +[keyserverID: string]: ?string },
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
  ) => {
    const deviceTokenUpdateRequest = {};

    for (const keyserverID in deviceTokens) {
      if (deviceTokens[keyserverID]) {
        deviceTokenUpdateRequest[keyserverID] = {
          deviceToken: deviceTokens[keyserverID],
        };
      }
    }
    // Return a function since we depend on the time of evaluation
    return (calendarActive: boolean): LogInExtraInfo => ({
      calendarQuery: calendarQuery(calendarActive),
      deviceTokenUpdateRequest,
    });
  },
);

const basePreRequestUserStateForSingleKeyserverSelector: (
  keyserverID: string,
) => (state: AppState) => PreRequestUserState = keyserverID =>
  createSelector(
    (state: AppState) => state.currentUserInfo,
    cookieSelector(keyserverID),
    sessionIDSelector(keyserverID),
    (
      currentUserInfo: ?CurrentUserInfo,
      cookie: ?string,
      sessionID: ?string,
    ) => ({
      currentUserInfo,
      cookiesAndSessions: { [keyserverID]: { cookie, sessionID } },
    }),
  );

const preRequestUserStateForSingleKeyserverSelector: (
  keyserverID: string,
) => (state: AppState) => PreRequestUserState = _memoize(
  basePreRequestUserStateForSingleKeyserverSelector,
);

const preRequestUserStateSelector: (state: AppState) => PreRequestUserState =
  createSelector(
    (state: AppState) => state.currentUserInfo,
    (state: AppState) => state.keyserverStore.keyserverInfos,
    (currentUserInfo: ?CurrentUserInfo, keyserverInfos: KeyserverInfos) => {
      const cookiesAndSessions: {
        [string]: PreRequestUserKeyserverSessionInfo,
      } = {};
      for (const keyserverID in keyserverInfos) {
        cookiesAndSessions[keyserverID] = {
          cookie: keyserverInfos[keyserverID].cookie,
          sessionID: keyserverInfos[keyserverID].sessionID,
        };
      }
      return {
        currentUserInfo,
        cookiesAndSessions,
      };
    },
  );

export {
  logInExtraInfoSelector,
  preRequestUserStateForSingleKeyserverSelector,
  preRequestUserStateSelector,
};
