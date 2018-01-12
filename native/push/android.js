// @flow

import FCM from 'react-native-fcm';

async function requestAndroidPushPermissions(
  missingDeviceToken: bool,
): Promise<?string> {
  if (!missingDeviceToken) {
    return null;
  }
  const requestResult = await FCM.requestPermissions();
  console.log(`Result from FCM.requestPermissions(): ${JSON.stringify(requestResult)}`);
  const token = await FCM.getFCMToken();
  console.log(`Token from FCM.getFCMToken(): ${JSON.stringify(token)}`);
  return token;
}

export {
  requestAndroidPushPermissions,
};
