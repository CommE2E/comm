// @flow

import PropTypes from 'prop-types';
import { Platform } from 'react-native';

export type GlobalTheme = 'light' | 'dark';
export type GlobalThemePreference = GlobalTheme | 'system';

export type GlobalThemeInfo = {|
  activeTheme: ?GlobalTheme,
  systemTheme: ?GlobalTheme,
  preference: GlobalThemePreference,
|};

export const globalThemeInfoPropType = PropTypes.shape({
  activeTheme: PropTypes.oneOf([ 'light', 'dark' ]),
  systemTheme: PropTypes.oneOf([ 'light', 'dark' ]),
  preference: PropTypes.oneOf([ 'light', 'dark', 'system' ]).isRequired,
});

export const osCanTheme = Platform.OS === "ios" &&
  parseInt(Platform.Version, 10) >= 13;

export const defaultGlobalThemeInfo = {
  activeTheme: osCanTheme ? null : 'light',
  systemTheme: null,
  preference: osCanTheme ? 'system' : 'light',
};
