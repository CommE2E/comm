// @flow

import FCM from 'react-native-fcm';

async function requestAndroidPushPermissions(): Promise<?string> {
  const requestResult = await FCM.requestPermissions();
  if (!requestResult) {
    return null;
  }
  return await FCM.getFCMToken();
}

const recordAndroidNotificationActionType = "RECORD_ANDROID_NOTIFICATION";
type RecordAndroidNotificationPayload = {|
  threadID: string,
  notifDBID: string,
|};

const clearAndroidNotificationActionType = "CLEAR_ANDROID_NOTIFICATION";
type ClearAndroidNotificationPayload = {|
  threadID: string,
|};

export type AndroidNotificationActions =
  | {|
    type: typeof recordAndroidNotificationActionType,
    payload: RecordAndroidNotificationPayload,
  |} | {|
    type: typeof clearAndroidNotificationActionType,
    payload: ClearAndroidNotificationPayload,
  |};

function reduceThreadIDsToNotifDBIDs(
  state: {[threadID: string]: string[]},
  action: AndroidNotificationActions,
): {[threadID: string]: string[]} {
  if (action.type === recordAndroidNotificationActionType) {
    return {
      ...state,
      [action.payload.threadID]: [
        ...state[action.payload.threadID],
        action.payload.notifDBID,
      ],
    };
  } else if (action.type === clearAndroidNotificationActionType) {
    return {
      ...state,
      [action.payload.threadID]: [],
    };
  } else {
    return state;
  }
}

export {
  requestAndroidPushPermissions,
  recordAndroidNotificationActionType,
  clearAndroidNotificationActionType,
  reduceThreadIDsToNotifDBIDs,
};
