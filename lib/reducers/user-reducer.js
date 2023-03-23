// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import _keyBy from 'lodash/fp/keyBy.js';

import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  joinThreadActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
  setUserSettingsActionTypes,
  updateUserAvatarActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  type UserInconsistencyReportCreationRequest,
  reportTypes,
} from '../types/report-types.js';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import {
  updateTypes,
  processUpdatesActionType,
} from '../types/update-types.js';
import type {
  CurrentUserInfo,
  UserStore,
  UserInfos,
} from '../types/user-types.js';
import { actionLogger } from '../utils/action-logger.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { getConfig } from '../utils/config.js';
import { sanitizeActionSecrets } from '../utils/sanitization.js';

function reduceCurrentUserInfo(
  state: ?CurrentUserInfo,
  action: BaseAction,
): ?CurrentUserInfo {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    if (!_isEqual(action.payload.currentUserInfo)(state)) {
      return action.payload.currentUserInfo;
    }
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo
  ) {
    const { sessionChange } = action.payload;
    if (!_isEqual(sessionChange.currentUserInfo)(state)) {
      return sessionChange.currentUserInfo;
    }
  } else if (action.type === fullStateSyncActionType) {
    const { currentUserInfo } = action.payload;
    if (!_isEqual(currentUserInfo)(state)) {
      return currentUserInfo;
    }
  } else if (
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    for (const update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.UPDATE_CURRENT_USER &&
        !_isEqual(update.currentUserInfo)(state)
      ) {
        return update.currentUserInfo;
      }
    }
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (
      checkStateRequest &&
      checkStateRequest.stateChanges &&
      checkStateRequest.stateChanges.currentUserInfo &&
      !_isEqual(checkStateRequest.stateChanges.currentUserInfo)(state)
    ) {
      return checkStateRequest.stateChanges.currentUserInfo;
    }
  } else if (
    action.type === updateUserAvatarActionTypes.success &&
    state &&
    !state.anonymous
  ) {
    return {
      ...state,
      avatar: action.payload,
    };
  } else if (action.type === setUserSettingsActionTypes.success) {
    if (state?.settings) {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    }
  }
  return state;
}

function findInconsistencies(
  action: BaseAction,
  beforeStateCheck: UserInfos,
  afterStateCheck: UserInfos,
): UserInconsistencyReportCreationRequest[] {
  if (_isEqual(beforeStateCheck)(afterStateCheck)) {
    return [];
  }
  return [
    {
      type: reportTypes.USER_INCONSISTENCY,
      platformDetails: getConfig().platformDetails,
      action: sanitizeActionSecrets(action),
      beforeStateCheck,
      afterStateCheck,
      lastActions: actionLogger.interestingActionSummaries,
      time: Date.now(),
    },
  ];
}

function reduceUserInfos(state: UserStore, action: BaseAction): UserStore {
  if (
    action.type === joinThreadActionTypes.success ||
    action.type === newThreadActionTypes.success
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const updated = { ...state.userInfos, ...newUserInfos };
    if (!_isEqual(state.userInfos)(updated)) {
      return {
        ...state,
        userInfos: updated,
      };
    }
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    if (Object.keys(state.userInfos).length === 0) {
      return state;
    }
    return {
      userInfos: {},
      inconsistencyReports: state.inconsistencyReports,
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === fullStateSyncActionType
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    if (!_isEqual(state.userInfos)(newUserInfos)) {
      return {
        userInfos: newUserInfos,
        inconsistencyReports: state.inconsistencyReports,
      };
    }
  } else if (
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const updated = { ...state.userInfos, ...newUserInfos };
    for (const update of action.payload.updatesResult.newUpdates) {
      if (update.type === updateTypes.DELETE_ACCOUNT) {
        delete updated[update.deletedUserID];
      }
    }
    if (!_isEqual(state.userInfos)(updated)) {
      return {
        userInfos: updated,
        inconsistencyReports: state.inconsistencyReports,
      };
    }
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return state;
    }
    const { userInfos, deleteUserInfoIDs } = checkStateRequest.stateChanges;
    if (!userInfos && !deleteUserInfoIDs) {
      return state;
    }

    const newUserInfos = { ...state.userInfos };
    if (userInfos) {
      for (const userInfo of userInfos) {
        newUserInfos[userInfo.id] = userInfo;
      }
    }
    if (deleteUserInfoIDs) {
      for (const deleteUserInfoID of deleteUserInfoIDs) {
        delete newUserInfos[deleteUserInfoID];
      }
    }

    const newInconsistencies = findInconsistencies(
      action,
      state.userInfos,
      newUserInfos,
    );
    return {
      userInfos: newUserInfos,
      inconsistencyReports: [
        ...state.inconsistencyReports,
        ...newInconsistencies,
      ],
    };
  }
  return state;
}

export { reduceCurrentUserInfo, reduceUserInfos };
