// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import _keyBy from 'lodash/fp/keyBy.js';

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { legacySiweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  joinThreadActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  findUserIdentitiesActionTypes,
  processNewUserIDsActionType,
  identityLogInActionTypes,
  identityRegisterActionTypes,
  deleteAccountActionTypes,
  keyserverAuthActionTypes,
  logOutActionTypes,
  legacyLogInActionTypes,
  legacyKeyserverRegisterActionTypes,
  setUserSettingsActionTypes,
  updateUserAvatarActionTypes,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
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
import {
  relyingOnAuthoritativeKeyserver,
  usingCommServicesAccessToken,
} from '../utils/services-utils.js';

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
  } else if (
    action.type === legacyLogInActionTypes.success ||
    action.type === legacySiweAuthActionTypes.success ||
    action.type === legacyKeyserverRegisterActionTypes.success ||
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
    const actionUserInfo = action.payload.sessionChange.currentUserInfo;
    if (!actionUserInfo?.id) {
      return actionUserInfo;
    } else if (!usingCommServicesAccessToken) {
      if (!_isEqual(actionUserInfo)(state)) {
        return actionUserInfo;
      }
    } else if (!state?.id || actionUserInfo.id !== state.id) {
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
    (action.type === incrementalStateSyncActionType ||
      action.type === processUpdatesActionType) &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return state;
    }
    return action.payload.updatesResult.newUpdates.reduce(
      (reducedState, update) => {
        const { reduceCurrentUser } = updateSpecs[update.type];
        return reduceCurrentUser
          ? reduceCurrentUser(reducedState, update)
          : reducedState;
      },
      state,
    );
  } else if (
    action.type === processServerRequestsActionType &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return state;
    }
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

function discardKeyserverUsernames(
  newUserInfos: UserInfos,
  stateUserInfos: UserInfos,
): UserInfos {
  let result: UserInfos = {};
  for (const id in newUserInfos) {
    if (stateUserInfos[id]) {
      result = {
        ...result,
        [id]: {
          ...newUserInfos[id],
          username: stateUserInfos[id].username,
        },
      };
    } else {
      result = {
        ...result,
        [id]: {
          ...newUserInfos[id],
          username: null,
        },
      };
    }
  }
  return result;
}

function reduceUserInfos(
  state: UserStore,
  action: BaseAction,
): [
  UserStore,
  $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>,
  $ReadOnlyArray<UserStoreOperation>,
] {
  if (action.type === processNewUserIDsActionType) {
    const filteredUserIDs = action.payload.userIDs.filter(
      id => !state.userInfos[id],
    );
    if (filteredUserIDs.length === 0) {
      return [state, [], []];
    }
    const newUserInfosArray = filteredUserIDs.map(id => ({
      id,
      username: null,
    }));
    const newUserInfos: UserInfos = _keyBy(userInfo => userInfo.id)(
      newUserInfosArray,
    );

    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );
    if (!_isEqual(state.userInfos)(processedUserInfos)) {
      return [
        {
          ...state,
          userInfos: processedUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (
    (action.type === joinThreadActionTypes.success ||
      action.type === newThreadActionTypes.success) &&
    relyingOnAuthoritativeKeyserver
  ) {
    let keyserverID;
    if (action.type === joinThreadActionTypes.success) {
      keyserverID = action.payload.keyserverID;
    } else {
      keyserverID = extractKeyserverIDFromID(action.payload.newThreadID);
    }
    if (keyserverID !== authoritativeKeyserverID()) {
      return [state, [], []];
    }
    const keyserverUserInfos: UserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );

    const newUserInfos = discardKeyserverUsernames(
      keyserverUserInfos,
      state.userInfos,
    );

    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );

    if (!_isEqual(state.userInfos)(processedUserInfos)) {
      return [
        {
          ...state,
          userInfos: processedUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (action.type === findUserIdentitiesActionTypes.success) {
    const newUserInfos = action.payload.userInfos.reduce(
      (acc, userInfo) => ({
        ...acc,
        [userInfo.id]: {
          ...state.userInfos[userInfo.id],
          username: userInfo.username,
        },
      }),
      {},
    );

    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );

    if (!_isEqual(state.userInfos)(processedUserInfos)) {
      return [
        {
          ...state,
          userInfos: processedUserInfos,
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

    if (Object.keys(state.userInfos).length === 0) {
      return [state, [], []];
    }
    return [
      {
        userInfos: processedUserInfos,
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

    if (!_isEqual(state.userInfos)(processedUserInfos)) {
      return [
        {
          userInfos: processedUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (
    action.type === legacyLogInActionTypes.success ||
    action.type === legacySiweAuthActionTypes.success ||
    action.type === legacyKeyserverRegisterActionTypes.success
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

    return [
      {
        userInfos: processedUserInfos,
      },
      [],
      userStoreOps,
    ];
  } else if (
    action.type === keyserverAuthActionTypes.success &&
    relyingOnAuthoritativeKeyserver
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );

    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );

    if (!_isEqual(state.userInfos)(processedUserInfos)) {
      return [
        {
          ...state,
          userInfos: processedUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (
    (action.type === incrementalStateSyncActionType ||
      action.type === processUpdatesActionType) &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return [state, [], []];
    }
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> = [
      ...convertUserInfosToReplaceUserOps(newUserInfos),
      ...generateOpsForUserUpdates(action.payload),
    ];

    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );

    if (!_isEqual(state.userInfos)(processedUserInfos)) {
      return [
        {
          ...state,
          userInfos: processedUserInfos,
        },
        [],
        userStoreOps,
      ];
    }
  } else if (
    action.type === processServerRequestsActionType &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return [state, [], []];
    }
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
    if (userInfos) {
      for (const userInfo of userInfos) {
        userStoreOps.push({ type: 'replace_user', payload: { ...userInfo } });
      }
    }
    if (deleteUserInfoIDs) {
      userStoreOps.push({
        type: 'remove_users',
        payload: { ids: deleteUserInfoIDs },
      });
    }

    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );

    const newInconsistencies = stateSyncSpecs.users.findStoreInconsistencies(
      action,
      state.userInfos,
      processedUserInfos,
    );
    return [
      {
        userInfos: processedUserInfos,
      },
      newInconsistencies,
      userStoreOps,
    ];
  } else if (
    action.type === updateUserAvatarActionTypes.success &&
    relyingOnAuthoritativeKeyserver
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.updates.userInfos,
    );
    const userStoreOps: $ReadOnlyArray<UserStoreOperation> =
      convertUserInfosToReplaceUserOps(newUserInfos);
    const processedUserInfos: UserInfos = processUserStoreOps(
      state.userInfos,
      userStoreOps,
    );

    const newState = !_isEqual(state.userInfos)(processedUserInfos)
      ? {
          ...state,
          userInfos: processedUserInfos,
        }
      : state;
    return [newState, [], userStoreOps];
  } else if (action.type === setClientDBStoreActionType) {
    if (!action.payload.users) {
      return [state, [], []];
    }

    return [{ userInfos: action.payload.users }, [], []];
  }

  return [state, [], []];
}

export { reduceCurrentUserInfo, reduceUserInfos };
