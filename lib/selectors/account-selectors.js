// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  cookieSelector,
  sessionIDSelector,
  deviceTokensSelector,
} from './keyserver-selectors.js';
import type {
  LogInExtraInfo,
  DeviceTokenUpdateRequest,
} from '../types/account-types.js';
import type { CalendarFilter } from '../types/filter-types.js';
import type { KeyserverInfos } from '../types/keyserver-types.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { AppState, BaseAppState } from '../types/redux-types.js';
import type {
  PreRequestUserState,
  PreRequestUserKeyserverSessionInfo,
} from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

const logInExtraInfoSelector: (state: AppState) => LogInExtraInfo =
  createSelector(
    (state: BaseAppState<>) => state.navInfo,
    (state: BaseAppState<>) => state.calendarFilters,
    (state: BaseAppState<>) => state.currentUserInfo,
    deviceTokensSelector,
    (
      navInfo: BaseNavInfo,
      calendarFilters: $ReadOnlyArray<CalendarFilter>,
      currentUserInfo: ?CurrentUserInfo,
      deviceTokens: { +[keyserverID: string]: ?string },
    ) => {
      const deviceTokenUpdateRequest: { [string]: DeviceTokenUpdateRequest } =
        {};

      for (const keyserverID in deviceTokens) {
        if (deviceTokens[keyserverID]) {
          deviceTokenUpdateRequest[keyserverID] = {
            deviceToken: deviceTokens[keyserverID],
          };
        }
      }
      return {
        calendarQuery: {
          startDate: navInfo.startDate,
          endDate: navInfo.endDate,
          filters: calendarFilters,
        },
        deviceTokenUpdateRequest,
        preRequestUserInfo: currentUserInfo,
      };
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
