// @flow

import {
  recordAndroidNotificationActionType,
  clearAndroidNotificationsActionType,
  rescindAndroidNotificationActionType,
} from '../redux/action-types';
import { getFirebase } from './firebase';

type RecordAndroidNotificationPayload = {|
  threadID: string,
  notifID: string,
|};

type ClearAndroidNotificationsPayload = {|
  threadID: string,
|};

type RescindAndroidNotificationPayload = {|
  notifID: string,
  threadID?: string,
|};

export type AndroidNotificationActions =
  | {|
      type: 'RECORD_ANDROID_NOTIFICATION',
      payload: RecordAndroidNotificationPayload,
    |}
  | {|
      type: 'CLEAR_ANDROID_NOTIFICATIONS',
      payload: ClearAndroidNotificationsPayload,
    |}
  | {|
      type: 'RESCIND_ANDROID_NOTIFICATION',
      payload: RescindAndroidNotificationPayload,
    |};

function reduceThreadIDsToNotifIDs(
  state: { [threadID: string]: string[] },
  action: AndroidNotificationActions,
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
    for (let notifID of state[action.payload.threadID]) {
      getFirebase()
        .notifications()
        .android.removeDeliveredNotificationsByTag(notifID);
    }
    return {
      ...state,
      [action.payload.threadID]: [],
    };
  } else if (action.type === rescindAndroidNotificationActionType) {
    const { threadID, notifID } = action.payload;
    if (threadID) {
      const existingNotifIDs = state[threadID];
      if (!existingNotifIDs) {
        return state;
      }
      const filtered = existingNotifIDs.filter(id => id !== notifID);
      if (filtered.length === existingNotifIDs.length) {
        return state;
      }
      return { ...state, [threadID]: filtered };
    }
    for (let candThreadID in state) {
      const existingNotifIDs = state[candThreadID];
      const filtered = existingNotifIDs.filter(id => id !== notifID);
      if (filtered.length !== existingNotifIDs.length) {
        return { ...state, [candThreadID]: filtered };
      }
    }
    return state;
  } else {
    return state;
  }
}

export { reduceThreadIDsToNotifIDs };
