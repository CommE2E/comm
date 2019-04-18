// @flow

import firebase from 'react-native-firebase';

import {
  recordAndroidNotificationActionType,
  clearAndroidNotificationActionType,
} from '../redux/action-types';

type RecordAndroidNotificationPayload = {|
  threadID: string,
  notifID: string,
|};

type ClearAndroidNotificationPayload = {|
  threadID: string,
|};

export type AndroidNotificationActions =
  | {|
    type: "RECORD_ANDROID_NOTIFICATION",
    payload: RecordAndroidNotificationPayload,
  |} | {|
    type: "CLEAR_ANDROID_NOTIFICATION",
    payload: ClearAndroidNotificationPayload,
  |};

function reduceThreadIDsToNotifIDs(
  state: {[threadID: string]: string[]},
  action: AndroidNotificationActions,
): {[threadID: string]: string[]} {
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
  } else if (action.type === clearAndroidNotificationActionType) {
    if (!state[action.payload.threadID]) {
      return state;
    }
    for (let notifID of state[action.payload.threadID]) {
      firebase.notifications().removeDeliveredNotification(notifID);
    }
    return {
      ...state,
      [action.payload.threadID]: [],
    };
  } else {
    return state;
  }
}

export {
  reduceThreadIDsToNotifIDs,
};
