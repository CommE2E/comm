// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import _keyBy from 'lodash/fp/keyBy.js';

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  joinThreadActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  identityLogInActionTypes,
  identityRegisterActionTypes,
  deleteAccountActionTypes,
  keyserverAuthActionTypes,
  logOutActionTypes,
  logInActionTypes,
  keyserverRegisterActionTypes,
  setUserSettingsActionTypes,
  updateUserAvatarActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
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
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { getMessageForException } from '../utils/errors.js';
import { assertObjectsAreEqual } from '../utils/objects.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

function reduceCurrentUserInfo(
  state: ?CurrentUserInfo,
  action: BaseAction,
): ?CurrentUserInfo {
  if (
    action.type === identityLogInActionTypes.success ||
    action.type === identityRegisterActionTypes.success
  ) {
    const newUserInfo = {
      id: action.payload.userID,
      username: action.payload.username,
    };
    if (!_isEqual(newUserInfo)(state)) {
      return newUserInfo;
    }
  } else if (action.type === keyserverAuthActionTypes.success) {
    const { currentUserInfo: actionUserInfo } = action.payload;
    if (actionUserInfo) {
      if (!state?.id || actionUserInfo.id !== state.id) {
        console.log(
          'keyserver auth returned a different user info than identity login',
        );
      } else {
        const newUserInfo = {
          ...state,
          avatar: actionUserInfo.avatar,
          settings: actionUserInfo.settings,
        };
        if (!_isEqual(newUserInfo)(state)) {
          return newUserInfo;
        }
      }
    }
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverRegisterActionTypes.success ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    if (!_isEqual(action.payload.currentUserInfo)(state)) {
      return action.payload.currentUserInfo;
    }
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    const { sessionChange } = action.payload;
    if (!_isEqual(sessionChange.currentUserInfo)(state)) {
      return sessionChange.currentUserInfo;
    }
  } else if (
    action.type === fullStateSyncActionType &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return state;
    }
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
    const newCurrentUserInfo = checkStateRequest?.stateChanges?.currentUserInfo;
    if (newCurrentUserInfo && !_isEqual(newCurrentUserInfo)(state)) {
      return newCurrentUserInfo;
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

function generateOpsForUserUpdates(payload: {
  +updatesResult: { +newUpdates: $ReadOnlyArray<ClientUpdateInfo>, ... },
  ...
}): $ReadOnlyArray<UserStoreOperation> {
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
): [
  UserStore,
  $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>,
  $ReadOnlyArray<UserStoreOperation>,
] {
  if (
    action.type === joinThreadActionTypes.success ||
    action.type === newThreadActionTypes.success
  ) {
    const newUserInfos: UserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );

    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
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
        userStoreOps,
      ];
    }
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> = [
      { type: 'remove_all_users' },
    ];
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );
    assertUserStoresAreEqual(
      processedUserInfos,
      {},
      action.type,
      onStateDifference,
    );

    if (Object.keys(state.userInfos).length === 0) {
      return [state, [], []];
    }
    return [
      {
        userInfos: {},
      },
      [],
      userStoreOps,
    ];
  } else if (
    action.type === fullStateSyncActionType &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return [state, [], []];
    }
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> = [
      { type: 'remove_all_users' },
      ...convertUserInfosToReplaceUserOps(newUserInfos),
    ];
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
    if (!_isEqual(state.userInfos)(newUserInfos)) {
      return [
        {
          userInfos: newUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverRegisterActionTypes.success
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> = [
      { type: 'remove_all_users' },
      ...convertUserInfosToReplaceUserOps(newUserInfos),
    ];
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

    return [
      {
        userInfos: newUserInfos,
      },
      [],
      userStoreOps,
    ];
  } else if (action.type === keyserverAuthActionTypes.success) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const mergedUserInfos: UserInfos = { ...state.userInfos, ...newUserInfos };

    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );
    assertUserStoresAreEqual(
      processedUserInfos,
      mergedUserInfos,
      action.type,
      onStateDifference,
    );

    if (!_isEqual(state.userInfos)(mergedUserInfos)) {
      return [
        {
          ...state,
          userInfos: mergedUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> = [
      ...convertUserInfosToReplaceUserOps(newUserInfos),
      ...generateOpsForUserUpdates(action.payload),
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
        userStoreOps,
      ];
    }
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return [state, [], []];
    }
    const { userInfos, deleteUserInfoIDs } = checkStateRequest.stateChanges;
    if (!userInfos && !deleteUserInfoIDs) {
      return [state, [], []];
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
      userStoreOps,
    ];
  } else if (action.type === updateUserAvatarActionTypes.success) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.updates.userInfos,
    );
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
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
    return [newState, [], userStoreOps];
  } else if (action.type === setClientDBStoreActionType) {
    if (!action.payload.users) {
      return [state, [], []];
    }
    // Once the functionality is confirmed to work correctly,
    // we will proceed with returning the users from the payload.
    assertUserStoresAreEqual(
      action.payload.users ?? {},
      state.userInfos,
      action.type,
      onStateDifference,
    );
    return [state, [], []];
  }

  return [state, [], []];
}

export { reduceCurrentUserInfo, reduceUserInfos };
