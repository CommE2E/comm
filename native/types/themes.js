// @flow

import { Platform } from 'react-native';

export type GlobalTheme = 'light' | 'dark';
export type GlobalThemePreference = GlobalTheme | 'system';

export type GlobalThemeInfo = {|
  +activeTheme: ?GlobalTheme,
  +systemTheme: ?GlobalTheme,
  +preference: GlobalThemePreference,
|};

export const osCanTheme =
  (Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 13) ||
  (Platform.OS === 'android' && Platform.Version >= 29);

export const defaultGlobalThemeInfo = {
  activeTheme: osCanTheme ? null : 'light',
  systemTheme: null,
  preference: osCanTheme ? 'system' : 'light',
};
