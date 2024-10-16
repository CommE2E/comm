// @flow

import { Alert, Platform } from 'react-native';

import { registerConfig } from 'lib/utils/config.js';

import { resolveKeyserverSessionInvalidationUsingNativeCredentials } from './account/legacy-recover-keyserver-session.js';
import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import { olmAPI } from './crypto/olm-api.js';
import { sqliteAPI } from './database/sqlite-api.js';
import encryptedNotifUtilsAPI from './push/encrypted-notif-utils-api.js';
import { persistConfig, codeVersion } from './redux/persist.js';

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
  showAlert: Alert.alert,
});
