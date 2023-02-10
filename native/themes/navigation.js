// @flow

import {
  DefaultTheme,
  DarkTheme as DefaultDarkTheme,
} from '@react-navigation/native';

import { colors } from './colors.js';

const DarkTheme = {
  ...DefaultDarkTheme,
  colors: {
    ...DefaultDarkTheme.colors,
    card: colors.dark.navigationCard,
  },
};
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    card: colors.light.navigationCard,
  },
};

export { DarkTheme, LightTheme };
