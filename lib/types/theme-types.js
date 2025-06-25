// @flow

export type GlobalTheme = 'light' | 'dark';
export type GlobalThemePreference = GlobalTheme | 'system';

export type GlobalThemeInfo = {
  +activeTheme: ?GlobalTheme,
  +systemTheme: ?GlobalTheme,
  +preference: GlobalThemePreference,
};

export const defaultGlobalThemeInfo = {
  // revert to `activeTheme: osCanTheme ? null : 'light'` to re-enable theming
  activeTheme: 'dark',
  systemTheme: null,
  // revert to `preference: osCanTheme ? 'system' : 'light'`
  // to re-enable theming
  preference: 'dark',
} as const;
