// @flow

import invariant from 'invariant';

import { messageStorePruneActionType } from '../actions/message-actions.js';
import {
  changeThreadMemberRolesActionTypes,
  changeThreadSettingsActionTypes,
  deleteCommunityRoleActionTypes,
  deleteThreadActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  modifyCommunityRoleActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import { incrementalStateSyncActionType } from '../types/socket-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import { updateThreadLastNavigatedActionType } from '../types/thread-activity-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../types/update-types.js';
import { processUpdatesActionType } from '../types/update-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

function reduceThreadActivity(
  state: ThreadActivityStore,
  action: BaseAction,
): ThreadActivityStore {
  if (action.type === updateThreadLastNavigatedActionType) {
    const { threadID, time } = action.payload;
    const updatedThreadActivityStore = {
      ...state,
      [threadID]: {
        ...state[threadID],
        lastNavigatedTo: time,
      },
    };
    return updatedThreadActivityStore;
  } else if (action.type === messageStorePruneActionType) {
    const now = Date.now();
    let updatedThreadActivityStore = { ...state };
    for (const threadID: string of action.payload.threadIDs) {
      updatedThreadActivityStore = {
        ...updatedThreadActivityStore,
        [threadID]: {
          ...updatedThreadActivityStore[threadID],
          lastPruned: now,
        },
      };
    }
    return updatedThreadActivityStore;
  } else if (
    action.type === joinThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success ||
    action.type === deleteThreadActionTypes.success ||
    action.type === changeThreadSettingsActionTypes.success ||
    action.type === removeUsersFromThreadActionTypes.success ||
    action.type === changeThreadMemberRolesActionTypes.success ||
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType ||
    action.type === newThreadActionTypes.success ||
    action.type === modifyCommunityRoleActionTypes.success ||
    action.type === deleteCommunityRoleActionTypes.success
  ) {
    const { newUpdates } = action.payload.updatesResult;
    if (newUpdates.length === 0) {
      return state;
    }

    const deleteThreadUpdates = newUpdates.filter(
      (update: ClientUpdateInfo) => update.type === updateTypes.DELETE_THREAD,
    );
    if (deleteThreadUpdates.length === 0) {
      return state;
    }

    let updatedState = { ...state };
    for (const update: ClientUpdateInfo of deleteThreadUpdates) {
      invariant(
        update.type === updateTypes.DELETE_THREAD,
        'update must be of type DELETE_THREAD',
      );
      const { [update.threadID]: _, ...stateSansRemovedThread } = updatedState;
      updatedState = stateSansRemovedThread;
    }
    return updatedState;
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {};
  }
  return state;
}

export { reduceThreadActivity };
