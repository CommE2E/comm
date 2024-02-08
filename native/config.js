// @flow

import { Platform } from 'react-native';

import { registerConfig } from 'lib/utils/config.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import { resolveKeyserverSessionInvalidationUsingNativeCredentials } from './account/legacy-recover-keyserver-session.js';
import { authoritativeKeyserverIDfromJSON } from './authoritative-keyserver-id.js';
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
  authoritativeKeyserverID:
    authoritativeKeyserverIDfromJSON ?? ashoatKeyserverID,
});
