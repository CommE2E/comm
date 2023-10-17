// @flow

import { Platform } from 'react-native';

export const osCanTheme: boolean =
  (Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 13) ||
  (Platform.OS === 'android' && Platform.Version >= 29);

export const defaultGlobalThemeInfo = {
  // revert to `activeTheme: osCanTheme ? null : 'light'` to re-enable theming
  activeTheme: 'dark',
  systemTheme: null,
  // revert to `preference: osCanTheme ? 'system' : 'light'`
  // to re-enable theming
  preference: 'dark',
};
