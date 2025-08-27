// @flow

import { Platform } from 'react-native';
import type { AlertOptions, AlertButton } from 'react-native';

import { registerConfig } from 'lib/utils/config.js';

import { resolveKeyserverSessionInvalidationUsingNativeCredentials } from './account/legacy-recover-keyserver-session.js';
import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import { olmAPI } from './crypto/olm-api.js';
import { sqliteAPI } from './database/sqlite-api.js';
import encryptedNotifUtilsAPI from './push/encrypted-notif-utils-api.js';
import { persistConfig, codeVersion } from './redux/persist.js';
import Alert from './utils/alert.js';
import { isStaffRelease } from './utils/staff-utils.js';

registerConfig({
  resolveKeyserverSessionInvalidationUsingNativeCredentials,
  setSessionIDOnRequest: false,
  calendarRangeInactivityLimit: 15 * 60 * 1000,
  platformDetails: {
    platform: Platform.OS,
    codeVersion,
    stateVersion: persistConfig.version,
  },
  authoritativeKeyserverID,
  olmAPI,
  sqliteAPI,
  encryptedNotifUtilsAPI,
  showAlert: (
    title: string,
    message: string,
    buttons?: $ReadOnlyArray<{
      +text: string,
      +onPress?: () => mixed,
      +style?: 'cancel' | 'default' | 'destructive',
    }>,
    options?: {
      +cancelable?: ?boolean,
    },
  ) => {
    let alertOptions: AlertOptions | void = undefined;
    if (options?.cancelable !== undefined) {
      alertOptions = {
        cancelable: options.cancelable,
      };
    }
    let alertButtons: Array<AlertButton> | void = undefined;
    if (buttons !== undefined) {
      alertButtons = buttons.map(button => ({
        text: button.text,
        onPress: button.onPress,
        style: button.style,
      }));
    }
    Alert.alert(title, message, alertButtons, alertOptions);
  },
  isStaffRelease: __DEV__ || isStaffRelease,
});
