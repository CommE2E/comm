// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

import invariant from 'invariant';

import { sessionInactivityLimit } from '../selectors/session-selectors';
import { reduceLoadingStatuses } from './loading-reducer';
import { reduceEntryInfos } from './entry-reducer';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer';
import reduceThreadInfos from './thread-reducer';
import reduceBaseNavInfo from './nav-reducer';
import reduceCookie from './cookie-reducer';
import { reduceSessionID } from './session-reducer';
import { reduceMessageStore } from './message-reducer';
import reduceUpdatesCurrentAsOf from './updates-reducer';
import { reduceDrafts } from './draft-reducer';
import reduceDeviceToken from './device-token-reducer';
import reduceURLPrefix from './url-prefix-reducer';
import reducePingTimestamps from './ping-timestamps-reducer';
import reduceServerRequests from './server-requests-reducer';
import reduceCalendarFilters from './calendar-filters-reducer';

export default function baseReducer<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  action: BaseAction,
): T {
  const threadStore = reduceThreadInfos(state.threadStore, action);
  const { threadInfos } = threadStore;

  // NavInfo has to be handled differently because of the covariance
  // (see comment about "+" in redux-types.js)
  const baseNavInfo = reduceBaseNavInfo(state.navInfo, action);
  const navInfo = baseNavInfo === state.navInfo
    ? state.navInfo
    : { ...state.navInfo, ...baseNavInfo };

  const entryStore = reduceEntryInfos(
    state.entryStore,
    action,
    threadInfos,
  );

  const currentLastUserInteractionSessionReset =
    state.lastUserInteraction.sessionReset;
  invariant(
    currentLastUserInteractionSessionReset !== undefined &&
      currentLastUserInteractionSessionReset !== null,
    "sessionReset should have an entry in lastUserInteraction",
  );
  let [sessionID, lastUserInteractionSessionReset] = reduceSessionID(
    state.sessionID,
    currentLastUserInteractionSessionReset,
    action,
  );

  // Allow calendar interaction to extend the lifetime of a session, but if the
  // session is too old force it to be dropped the next time it's used
  const lastUserInteractionCalendar = entryStore.lastUserInteractionCalendar;
  if (
    lastUserInteractionSessionReset < lastUserInteractionCalendar &&
    (lastUserInteractionSessionReset + sessionInactivityLimit
      > lastUserInteractionCalendar)
  ) {
    lastUserInteractionSessionReset = lastUserInteractionCalendar;
  }
  return {
    ...state,
    navInfo,
    entryStore,
    lastUserInteraction: {
      ...state.lastUserInteraction,
      sessionReset: lastUserInteractionSessionReset,
    },
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    currentUserInfo: reduceCurrentUserInfo(state.currentUserInfo, action),
    threadStore,
    userInfos: reduceUserInfos(state.userInfos, action),
    messageStore: reduceMessageStore(state.messageStore, action, threadInfos),
    drafts: reduceDrafts(state.drafts, action),
    updatesCurrentAsOf: reduceUpdatesCurrentAsOf(
      state.updatesCurrentAsOf,
      action,
    ),
    cookie: reduceCookie(state.cookie, action),
    sessionID,
    deviceToken: reduceDeviceToken(state.deviceToken, action),
    urlPrefix: reduceURLPrefix(state.urlPrefix, action),
    pingTimestamps: reducePingTimestamps(state.pingTimestamps, action),
    activeServerRequests: reduceServerRequests(
      state.activeServerRequests,
      action,
    ),
    calendarFilters: reduceCalendarFilters(
      state.calendarFilters,
      action,
    ),
  };
}
