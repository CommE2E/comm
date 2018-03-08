// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';

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
import reduceCurrentAsOf from './current-as-of-reducer';
import { reduceDrafts } from './draft-reducer';
import reduceDeviceToken from './device-token-reducer';
import reduceURLPrefix from './url-prefix-reducer';

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

  const entryStore = reduceEntryInfos(state.entryStore, action);

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
    threadInfos: reduceThreadInfos(state.threadInfos, action),
    userInfos: reduceUserInfos(state.userInfos, action),
    messageStore: reduceMessageStore(state.messageStore, action),
    drafts: reduceDrafts(state.drafts, action),
    currentAsOf: reduceCurrentAsOf(state.currentAsOf, action),
    cookie: reduceCookie(state.cookie, action),
    sessionID,
    deviceToken: reduceDeviceToken(state.deviceToken, action),
    urlPrefix: reduceURLPrefix(state.urlPrefix, action),
  };
}
