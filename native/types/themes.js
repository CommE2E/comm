// @flow

import { Platform } from 'react-native';

export const osCanTheme: boolean =
  (Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 13) ||
  (Platform.OS === 'android' && Platform.Version >= 29);
