// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { createSelector } from 'reselect';

import {
  cookieSelector,
  sessionIDSelector,
  deviceTokensSelector,
} from './keyserver-selectors.js';
import { useDerivedObject } from '../hooks/objects.js';
import type {
  LogInExtraInfo,
  DeviceTokenUpdateRequest,
} from '../types/account-types.js';
import type { CalendarFilter } from '../types/filter-types.js';
import type { KeyserverInfo } from '../types/keyserver-types.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { AppState, BaseAppState } from '../types/redux-types.js';
import type {
  PreRequestUserState,
  PreRequestUserKeyserverSessionInfo,
} from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';

const logInExtraInfoSelector: (state: AppState) => LogInExtraInfo =
  createSelector(
    (state: BaseAppState<>) => state.navInfo,
    (state: BaseAppState<>) => state.calendarFilters,
    deviceTokensSelector,
    (
      navInfo: BaseNavInfo,
      calendarFilters: $ReadOnlyArray<CalendarFilter>,
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

const createPreRequestUserKeyserverSessionSelector: () => KeyserverInfo => PreRequestUserKeyserverSessionInfo =
  () =>
    createSelector(
      (keyserverInfo: KeyserverInfo) => keyserverInfo.cookie,
      (keyserverInfo: KeyserverInfo) => keyserverInfo.sessionID,
      (cookie: ?string, sessionID: ?string) => ({ cookie, sessionID }),
    );

function usePreRequestUserState(): PreRequestUserState {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );
  const cookiesAndSessions = useDerivedObject(
    keyserverInfos,
    createPreRequestUserKeyserverSessionSelector,
  );
  return React.useMemo(
    () => ({
      currentUserInfo,
      cookiesAndSessions,
    }),
    [currentUserInfo, cookiesAndSessions],
  );
}

export {
  logInExtraInfoSelector,
  preRequestUserStateForSingleKeyserverSelector,
  usePreRequestUserState,
};
