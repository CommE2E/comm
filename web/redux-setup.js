// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { VerifyField } from 'lib/utils/verify-utils';
import type { MessageStore } from 'lib/types/message-types';

import PropTypes from 'prop-types';

import baseReducer from 'lib/reducers/master-reducer';
import { newThreadActionTypes } from 'lib/actions/thread-actions';

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
  entryStore: EntryStore,
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  currentAsOf: number,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  deviceToken: ?string,
|};

export const reflectRouteChangeActionType = "REFLECT_ROUTE_CHANGE";

export type Action =
  | BaseAction
  | {| type: "REFLECT_ROUTE_CHANGE", payload: NavInfo |};

export function reducer(state: AppState, action: Action) {
  if (action.type === reflectRouteChangeActionType) {
    return {
      navInfo: action.payload,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      verifyField: state.verifyField,
      resetPasswordUsername: state.resetPasswordUsername,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
    };
  } else if (action.type === newThreadActionTypes.success) {
    return {
      navInfo: {
        startDate: state.navInfo.startDate,
        endDate: state.navInfo.endDate,
        home: false,
        threadID: action.payload.newThreadInfo.id,
        verify: state.navInfo.verify,
      },
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      verifyField: state.verifyField,
      resetPasswordUsername: state.resetPasswordUsername,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
    };
  }
  return baseReducer(state, action);
}
