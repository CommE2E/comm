// @flow

import type { StackOptions } from '@react-navigation/core';
import { Platform } from 'react-native';

const defaultStackScreenOptions: StackOptions = {
  gestureEnabled: Platform.OS === 'ios',
  animationEnabled:
    Platform.OS !== 'web' &&
    Platform.OS !== 'windows' &&
    Platform.OS !== 'macos',
};

export { defaultStackScreenOptions };
