// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';

import invariant from 'invariant';

import { sessionInactivityLimit } from '../selectors/session-selectors';
import { reduceLoadingStatuses } from './loading-reducer';
import { reduceEntryInfos } from './entry-reducer';
import reduceUserInfo from './user-reducer';
import reduceThreadInfos from './thread-reducer';
import reduceBaseNavInfo from './nav-reducer';
import reduceCookie from './cookie-reducer';
import reduceSessionID from './session-reducer';
import { reduceMessageStore } from './message-reducer';

export default function baseReducer<T: BaseAppState>(
  state: T,
  action: BaseAction,
): T {
  // NavInfo has to be handled differently because of the covariance
  // (see comment about "+" in redux-types.js)
  const baseNavInfo = reduceBaseNavInfo(state.navInfo, action);
  const navInfo = baseNavInfo === state.navInfo
    ? state.navInfo
    : { ...state.navInfo, ...baseNavInfo };
  const currentLastUserInteractionCalendar = state.lastUserInteraction.calendar;
  invariant(
    currentLastUserInteractionCalendar !== undefined &&
      currentLastUserInteractionCalendar !== null,
    "calendar should have an entry in lastUserInteraction",
  );
  const currentLastUserInteractionSessionReset =
    state.lastUserInteraction.sessionReset;
  invariant(
    currentLastUserInteractionSessionReset !== undefined &&
      currentLastUserInteractionSessionReset !== null,
    "sessionReset should have an entry in lastUserInteraction",
  );
  const [entryInfos, daysToEntries, lastUserInteractionCalendar] =
    reduceEntryInfos(
      state.entryInfos,
      state.daysToEntries,
      currentLastUserInteractionCalendar,
      action,
    );
  let [sessionID, lastUserInteractionSessionReset] = reduceSessionID(
    state.sessionID,
    currentLastUserInteractionSessionReset,
    action,
  );
  // Allow calendar interaction to extend the lifetime of a session, but if the
  // session is too old force it to be dropped the next time it's used
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
    entryInfos,
    daysToEntries,
    lastUserInteraction: {
      ...state.lastUserInteraction,
      calendar: lastUserInteractionCalendar,
      sessionReset: lastUserInteractionSessionReset,
    },
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    userInfo: reduceUserInfo(state.userInfo, action),
    threadInfos: reduceThreadInfos(state.threadInfos, action),
    messageStore: reduceMessageStore(state.messageStore, action),
    cookie: reduceCookie(state.cookie, action),
    sessionID,
  };
}
