// @flow

import { Platform } from 'react-native';

import { registerConfig } from 'lib/utils/config';

import { resolveInvalidatedCookie } from './account/resolve-invalidated-cookie';
import { persistConfig, codeVersion } from './persist';

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
