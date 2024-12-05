// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import _keyBy from 'lodash/fp/keyBy.js';

import { removePeerUsersActionType } from '../actions/aux-user-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { findUserIdentitiesActionTypes } from '../actions/find-user-identities-actions.js';
import { legacySiweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  joinThreadActionTypes,
  newThreadActionTypes,
} from '../actions/thread-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import {
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
  identityRestoreActionTypes,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
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
  stateSyncPayloadTypes,
  type ClientStateSyncIncrementalSocketResult,
  type StateSyncIncrementalActionPayload,
} from '../types/socket-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import {
  processUpdatesActionType,
  type ClientUpdateInfo,
  type ClientUpdatesResultWithUserInfos,
} from '../types/update-types.js';
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

function handleCurrentUserUpdates(
  state: ?CurrentUserInfo,
  newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
): ?CurrentUserInfo {
  return newUpdates.reduce((reducedState, update) => {
    const { reduceCurrentUser } = updateSpecs[update.type];
    return reduceCurrentUser
      ? reduceCurrentUser(reducedState, update)
      : reducedState;
  }, state);
}

function reduceCurrentUserInfo(
  state: ?CurrentUserInfo,
  action: BaseAction,
): ?CurrentUserInfo {
  if (
    action.type === identityLogInActionTypes.success ||
    action.type === identityRestoreActionTypes.success ||
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
    (action.type === fullStateSyncActionType ||
      (action.type === fetchPendingUpdatesActionTypes.success &&
        action.payload.type === stateSyncPayloadTypes.FULL)) &&
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
    return handleCurrentUserUpdates(
      state,
      action.payload.updatesResult.newUpdates,
    );
  } else if (action.type === fetchPendingUpdatesActionTypes.success) {
    if (!relyingOnAuthoritativeKeyserver) {
      return state;
    }
    const { payload } = action;
    if (payload.type !== stateSyncPayloadTypes.INCREMENTAL) {
      return state;
    }
    const { newUpdates } = payload.updatesResult;
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return state;
    }
    return handleCurrentUserUpdates(state, newUpdates);
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
  if (!usingCommServicesAccessToken) {
    return newUserInfos;
  }
  let result: UserInfos = {};
  for (const id in newUserInfos) {
    const username = stateUserInfos[id] ? stateUserInfos[id].username : null;
    result = {
      ...result,
      [id]: {
        ...newUserInfos[id],
        username,
      },
    };
  }
  return result;
}

type ReduceUserInfosResult = [
  UserStore,
  $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>,
  $ReadOnlyArray<UserStoreOperation>,
];

function handleUserInfoUpdates(
  state: UserStore,
  payload:
    | ClientStateSyncIncrementalSocketResult
    | StateSyncIncrementalActionPayload
    | ClientUpdatesResultWithUserInfos,
): ReduceUserInfosResult {
  if (payload.keyserverID !== authoritativeKeyserverID()) {
    return [state, [], []];
  }
  const keyserverUserInfos = _keyBy(userInfo => userInfo.id)(payload.userInfos);
  const newUserInfos = discardKeyserverUsernames(
    keyserverUserInfos,
    state.userInfos,
  );

  const userStoreOps: $ReadOnlyArray<UserStoreOperation> = [
    ...convertUserInfosToReplaceUserOps(newUserInfos),
    ...generateOpsForUserUpdates(payload),
  ];

  const processedUserInfos: UserInfos = processUserStoreOps(
    state.userInfos,
    userStoreOps,
  );

  if (_isEqual(state.userInfos)(processedUserInfos)) {
    return [state, [], []];
  }

  return [
    {
      ...state,
      userInfos: processedUserInfos,
    },
    [],
    userStoreOps,
  ];
}

function reduceUserInfos(
  state: UserStore,
  action: BaseAction,
): ReduceUserInfosResult {
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
      keyserverID = extractKeyserverIDFromIDOptional(
        action.payload.newThreadID,
      );
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
    const newUserInfos = action.payload.userInfos.reduce((acc, userInfo) => {
      const existingUserInfo = state.userInfos[userInfo.id];
      if (!existingUserInfo) {
        return acc;
      }
      return {
        ...acc,
        [userInfo.id]: {
          ...existingUserInfo,
          username: userInfo.username,
        },
      };
    }, {});

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
    (action.type === fullStateSyncActionType ||
      (action.type === fetchPendingUpdatesActionTypes.success &&
        action.payload.type === stateSyncPayloadTypes.FULL)) &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return [state, [], []];
    }
    const keyserverUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    const newUserInfos = discardKeyserverUsernames(
      keyserverUserInfos,
      state.userInfos,
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
    const keyserverUserInfos = _keyBy(userInfo => userInfo.id)(
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
  } else if (
    (action.type === incrementalStateSyncActionType ||
      action.type === processUpdatesActionType) &&
    relyingOnAuthoritativeKeyserver
  ) {
    return handleUserInfoUpdates(state, action.payload);
  } else if (action.type === fetchPendingUpdatesActionTypes.success) {
    if (!relyingOnAuthoritativeKeyserver) {
      return [state, [], []];
    }
    const { payload } = action;
    if (payload.type === stateSyncPayloadTypes.INCREMENTAL) {
      return handleUserInfoUpdates(state, payload);
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

    const keyserverUserInfos = _keyBy(userInfo => userInfo.id)(userInfos);
    const newUserInfos = discardKeyserverUsernames(
      keyserverUserInfos,
      state.userInfos,
    );

    const userStoreOps: UserStoreOperation[] = [
      ...convertUserInfosToReplaceUserOps(newUserInfos),
    ];

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
  } else if (action.type === removePeerUsersActionType) {
    const userIDs = action.payload.updatesResult.newUpdates.map(
      update => update.deletedUserID,
    );
    const userStoreOps: UserStoreOperation[] = [
      {
        type: 'remove_users',
        payload: { ids: userIDs },
      },
    ];

    return [
      {
        userInfos: processUserStoreOps(state.userInfos, userStoreOps),
      },
      [],
      userStoreOps,
    ];
  } else if (action.type === updateUserAvatarActionTypes.success) {
    const keyserverUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.updates.userInfos,
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
