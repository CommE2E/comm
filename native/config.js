// @flow

import { Platform } from 'react-native';

import { registerConfig } from 'lib/utils/config.js';

import { resolveInvalidatedCookie } from './account/resolve-invalidated-cookie.js';
import { persistConfig, codeVersion } from './redux/persist.js';

registerConfig({
  resolveInvalidatedCookie,
  setCookieOnRequest: true,
  setSessionIDOnRequest: false,
  calendarRangeInactivityLimit: 15 * 60 * 1000,
  platformDetails: {
    platform: Platform.OS,
    codeVersion,
    stateVersion: persistConfig.version,
  },
});
