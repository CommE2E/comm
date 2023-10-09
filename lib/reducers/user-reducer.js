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
  resetUserStateActionType,
} from '../actions/user-actions.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import type { BaseAction } from '../types/redux-types.js';
import type { UserInconsistencyReportCreationRequest } from '../types/report-types.js';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import { processUpdatesActionType } from '../types/update-types.js';
import type { CurrentUserInfo, UserStore } from '../types/user-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

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
    return action.payload.updatesResult.newUpdates.reduce(
      (reducedState, update) => {
        const { reduceCurrentUser } = updateSpecs[update.type];
        return reduceCurrentUser
          ? reduceCurrentUser(reducedState, update)
          : reducedState;
      },
      state,
    );
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
    const { viewerUpdates } = action.payload.updates;
    for (const update of viewerUpdates) {
      if (
        update.type === updateTypes.UPDATE_CURRENT_USER &&
        !_isEqual(update.currentUserInfo.avatar)(state.avatar)
      ) {
        return {
          ...state,
          avatar: update.currentUserInfo.avatar,
        };
      }
    }
    return state;
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
  } else if (action.type === resetUserStateActionType) {
    state = state && state.anonymous ? state : null;
  }
  return state;
}

function reduceUserInfos(
  state: UserStore,
  action: BaseAction,
): [UserStore, $ReadOnlyArray<UserInconsistencyReportCreationRequest>] {
  if (
    action.type === joinThreadActionTypes.success ||
    action.type === newThreadActionTypes.success
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const updated = { ...state.userInfos, ...newUserInfos };
    if (!_isEqual(state.userInfos)(updated)) {
      return [
        {
          ...state,
          userInfos: updated,
        },
        [],
      ];
    }
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    if (Object.keys(state.userInfos).length === 0) {
      return [state, []];
    }
    return [
      {
        userInfos: {},
      },
      [],
    ];
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
      return [
        {
          userInfos: newUserInfos,
        },
        [],
      ];
    }
  } else if (
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const updated = action.payload.updatesResult.newUpdates.reduce(
      (reducedState, update) => {
        const { reduceUserInfos: reduceUserInfosUpdate } =
          updateSpecs[update.type];
        return reduceUserInfosUpdate
          ? reduceUserInfosUpdate(reducedState, update)
          : reducedState;
      },
      { ...state.userInfos, ...newUserInfos },
    );
    if (!_isEqual(state.userInfos)(updated)) {
      return [
        {
          ...state,
          userInfos: updated,
        },
        [],
      ];
    }
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return [state, []];
    }
    const { userInfos, deleteUserInfoIDs } = checkStateRequest.stateChanges;
    if (!userInfos && !deleteUserInfoIDs) {
      return [state, []];
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

    const newInconsistencies = stateSyncSpecs.users.findStoreInconsistencies(
      action,
      state.userInfos,
      newUserInfos,
    );
    return [
      {
        userInfos: newUserInfos,
      },
      newInconsistencies,
    ];
  } else if (action.type === updateUserAvatarActionTypes.success) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.updates.userInfos,
    );
    const updated = { ...state.userInfos, ...newUserInfos };
    const newState = !_isEqual(state.userInfos)(updated)
      ? {
          ...state,
          userInfos: updated,
        }
      : state;
    return [newState, []];
  }

  return [state, []];
}

export { reduceCurrentUserInfo, reduceUserInfos };
