// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';
import { setNewSessionActionType } from 'lib/utils/action-utils';

import {
  recordAndroidNotificationActionType,
  clearAndroidNotificationsActionType,
  rescindAndroidNotificationActionType,
  type Action,
} from '../redux/action-types';

type RecordAndroidNotificationPayload = {
  +threadID: string,
  +notifID: string,
};

type ClearAndroidNotificationsPayload = {
  +threadID: string,
};

type RescindAndroidNotificationPayload = {
  +notifID: string,
  +threadID: string,
};

export type AndroidNotificationActions =
  | {
      +type: 'RECORD_ANDROID_NOTIFICATION',
      +payload: RecordAndroidNotificationPayload,
    }
  | {
      +type: 'CLEAR_ANDROID_NOTIFICATIONS',
      +payload: ClearAndroidNotificationsPayload,
    }
  | {
      +type: 'RESCIND_ANDROID_NOTIFICATION',
      +payload: RescindAndroidNotificationPayload,
    };

function reduceThreadIDsToNotifIDs(
  state: { [threadID: string]: string[] },
  action: Action,
): { [threadID: string]: string[] } {
  if (action.type === recordAndroidNotificationActionType) {
    const existingNotifIDs = state[action.payload.threadID];
    let set;
    if (existingNotifIDs) {
      set = new Set([...existingNotifIDs, action.payload.notifID]);
    } else {
      set = new Set([action.payload.notifID]);
    }
    return {
      ...state,
      [action.payload.threadID]: [...set],
    };
  } else if (action.type === clearAndroidNotificationsActionType) {
    if (!state[action.payload.threadID]) {
      return state;
    }
    return {
      ...state,
      [action.payload.threadID]: [],
    };
  } else if (action.type === rescindAndroidNotificationActionType) {
    const { threadID, notifID } = action.payload;
    const existingNotifIDs = state[threadID];
    if (!existingNotifIDs) {
      return state;
    }
    const filtered = existingNotifIDs.filter(id => id !== notifID);
    if (filtered.length === existingNotifIDs.length) {
      return state;
    }
    return { ...state, [threadID]: filtered };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {};
  } else {
    return state;
  }
}

export { reduceThreadIDsToNotifIDs };
