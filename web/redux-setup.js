// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { VerifyField } from 'lib/utils/verify-utils';
import type { MessageStore } from 'lib/types/message-types';

import PropTypes from 'prop-types';

import baseReducer from 'lib/reducers/master-reducer';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  verify: ?string,
|};

export const navInfoPropType = PropTypes.shape({
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  home: PropTypes.bool.isRequired,
  threadID: PropTypes.string,
  verify: PropTypes.string,
});

export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  verifyField: ?VerifyField,
  resetPasswordUsername: string,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: ThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
|};

export type Action = BaseAction |
  {| type: "REFLECT_ROUTE_CHANGE", payload: NavInfo |};

export function reducer(state: AppState, action: Action) {
  if (action.type === "REFLECT_ROUTE_CHANGE") {
    return {
      navInfo: action.payload,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      verifyField: state.verifyField,
      resetPasswordUsername: state.resetPasswordUsername,
      entryInfos: state.entryInfos,
      daysToEntries: state.daysToEntries,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
    };
  }
  return baseReducer(state, action);
}
