// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { VerifyField } from 'lib/types/verify-types';
import type { MessageStore } from 'lib/types/message-types';
import type { PingTimestamps } from 'lib/types/ping-types';
import type { ServerRequest } from 'lib/types/request-types';

import PropTypes from 'prop-types';
import invariant from 'invariant';

import baseReducer from 'lib/reducers/master-reducer';
import {
  newThreadActionTypes,
  deleteThreadActionTypes,
} from 'lib/actions/thread-actions';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  calendar: bool,
  chat: bool,
  verify: ?string,
|};

export const navInfoPropType = PropTypes.shape({
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  home: PropTypes.bool.isRequired,
  threadID: PropTypes.string,
  calendar: PropTypes.bool.isRequired,
  chat: PropTypes.bool.isRequired,
  verify: PropTypes.string,
});

export type WindowDimensions = {| width: number, height: number |};
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
  updatesCurrentAsOf: number,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  pingTimestamps: PingTimestamps,
  activeServerRequests: $ReadOnlyArray<ServerRequest>,
  cookie: ?string,
  deviceToken: ?string,
  urlPrefix: string,
  windowDimensions: WindowDimensions,
|};

export const reflectRouteChangeActionType = "REFLECT_ROUTE_CHANGE";
export const updateWindowDimensions = "UPDATE_WINDOW_DIMENSIONS";

export type Action =
  | BaseAction
  | {| type: "REFLECT_ROUTE_CHANGE", payload: NavInfo |}
  | {|
      type: "UPDATE_WINDOW_DIMENSIONS",
      payload: WindowDimensions,
    |};

export function reducer(inputState: AppState | void, action: Action) {
  let state = inputState;
  invariant(state, "should be set");
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
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      pingTimestamps: state.pingTimestamps,
      activeServerRequests: state.activeServerRequests,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      windowDimensions: state.windowDimensions,
    };
  } else if (action.type === updateWindowDimensions) {
    return {
      navInfo: state.navInfo,
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
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      pingTimestamps: state.pingTimestamps,
      activeServerRequests: state.activeServerRequests,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      windowDimensions: action.payload,
    };
  }
  if (action.type === newThreadActionTypes.success) {
    state = {
      navInfo: {
        startDate: state.navInfo.startDate,
        endDate: state.navInfo.endDate,
        home: false,
        threadID: action.payload.newThreadInfo.id,
        calendar: state.navInfo.calendar,
        chat: state.navInfo.chat,
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
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      pingTimestamps: state.pingTimestamps,
      activeServerRequests: state.activeServerRequests,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      windowDimensions: state.windowDimensions,
    };
  } else if (
    action.type === deleteThreadActionTypes.success &&
    action.payload.threadID === state.navInfo.threadID
  ) {
    state = {
      navInfo: {
        startDate: state.navInfo.startDate,
        endDate: state.navInfo.endDate,
        home: true,
        threadID: null,
        calendar: state.navInfo.calendar,
        chat: state.navInfo.chat,
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
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      pingTimestamps: state.pingTimestamps,
      activeServerRequests: state.activeServerRequests,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      windowDimensions: state.windowDimensions,
    };
  }
  return baseReducer(state, action);
}
