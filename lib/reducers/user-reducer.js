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
import {
  convertUserInfosToReplaceUserOps,
  type UserStoreOperation,
  userStoreOpsHandlers,
} from '../ops/user-store-ops.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import type { BaseAction } from '../types/redux-types.js';
import type { ClientUserInconsistencyReportCreationRequest } from '../types/report-types.js';
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
import type { ClientUpdateInfo } from '../types/update-types.js';
import type {
  CurrentUserInfo,
  UserInfos,
  UserStore,
} from '../types/user-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { assertObjectsAreEqual } from '../utils/objects.js';

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

function assertUserStoresAreEqual(
  processedUserStore: UserInfos,
  expectedUserStore: UserInfos,
  location: string,
  onStateDifference: (message: string) => mixed,
) {
  try {
    assertObjectsAreEqual(
      processedUserStore,
      expectedUserStore,
      `UserInfos - ${location}`,
    );
  } catch (e) {
    console.log(
      'Error processing UserStore ops',
      processedUserStore,
      expectedUserStore,
    );
    const message = `Error processing UserStore ops ${
      getMessageForException(e) ?? '{no exception message}'
    }`;
    onStateDifference(message);
  }
}

const { processStoreOperations: processUserStoreOps } = userStoreOpsHandlers;

function generateOpsForUserUpdates(
  userInfos: UserInfos,
  payload: {
    +updatesResult: { +newUpdates: $ReadOnlyArray<ClientUpdateInfo>, ... },
    ...
  },
): $ReadOnlyArray<UserStoreOperation> {
  return payload.updatesResult.newUpdates
    .map(update =>
      updateSpecs[update.type].generateOpsForUserInfoUpdates?.(update),
    )
    .filter(Boolean)
    .flat();
}

function reduceUserInfos(
  state: UserStore,
  action: BaseAction,
  onStateDifference: (message: string) => mixed,
): [UserStore, $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>] {
  if (
    action.type === joinThreadActionTypes.success ||
    action.type === newThreadActionTypes.success
  ) {
    const newUserInfos: UserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );

    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      convertUserInfosToReplaceUserOps(newUserInfos),
    );
    const updated: UserInfos = { ...state.userInfos, ...newUserInfos };
    assertUserStoresAreEqual(
      processedUserInfos,
      updated,
      action.type,
      onStateDifference,
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
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    const processedUserInfos: UserInfos = processUserStoreOps(state.userInfos, [
      { type: 'remove_all_users' },
    ]);
    assertUserStoresAreEqual(
      processedUserInfos,
      {},
      action.type,
      onStateDifference,
    );

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
    const processedUserInfos: UserInfos = processUserStoreOps(state.userInfos, [
      { type: 'remove_all_users' },
      ...convertUserInfosToReplaceUserOps(newUserInfos),
    ]);
    assertUserStoresAreEqual(
      processedUserInfos,
      newUserInfos,
      action.type,
      onStateDifference,
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
    const userStoreOps: UserStoreOperation[] = [
      ...convertUserInfosToReplaceUserOps(newUserInfos),
      ...generateOpsForUserUpdates(state.userInfos, action.payload),
    ];
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

    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );
    assertUserStoresAreEqual(
      processedUserInfos,
      updated,
      action.type,
      onStateDifference,
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

    const userStoreOps: UserStoreOperation[] = [];
    const newUserInfos = { ...state.userInfos };
    if (userInfos) {
      for (const userInfo of userInfos) {
        newUserInfos[userInfo.id] = userInfo;
        userStoreOps.push({ type: 'replace_user', payload: { ...userInfo } });
      }
    }
    if (deleteUserInfoIDs) {
      for (const deleteUserInfoID of deleteUserInfoIDs) {
        delete newUserInfos[deleteUserInfoID];
      }
      userStoreOps.push({
        type: 'remove_users',
        payload: { ids: deleteUserInfoIDs },
      });
    }

    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );
    assertUserStoresAreEqual(
      processedUserInfos,
      newUserInfos,
      action.type,
      onStateDifference,
    );

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
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      convertUserInfosToReplaceUserOps(newUserInfos),
    );
    const updated: UserInfos = { ...state.userInfos, ...newUserInfos };
    assertUserStoresAreEqual(
      processedUserInfos,
      updated,
      action.type,
      onStateDifference,
    );
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
