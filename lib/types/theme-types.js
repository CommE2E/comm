// @flow

export type GlobalTheme = 'light' | 'dark';
export type GlobalThemePreference = GlobalTheme | 'system';

export type GlobalThemeInfo = {
  +activeTheme: ?GlobalTheme,
  +systemTheme: ?GlobalTheme,
  +preference: GlobalThemePreference,
};
