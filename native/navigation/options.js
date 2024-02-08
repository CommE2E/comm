// @flow

import type {
  StackOptions,
  StackCardInterpolationProps,
  TransitionPreset,
  StackCardInterpolatedStyle,
} from '@react-navigation/core';
import { TransitionPresets } from '@react-navigation/stack';
import { Platform } from 'react-native';

const defaultStackScreenOptions: StackOptions = {
  gestureEnabled: Platform.OS === 'ios',
  animationEnabled:
    Platform.OS !== 'web' &&
    Platform.OS !== 'windows' &&
    Platform.OS !== 'macos',
};

const baseTransitionPreset: TransitionPreset = Platform.select({
  ios: TransitionPresets.ModalSlideFromBottomIOS,
  default: TransitionPresets.FadeFromBottomAndroid,
});
const transitionPreset = {
  ...baseTransitionPreset,
  cardStyleInterpolator: (
    interpolatorProps: StackCardInterpolationProps,
  ): StackCardInterpolatedStyle => {
    const baseCardStyleInterpolator =
      baseTransitionPreset.cardStyleInterpolator(interpolatorProps);
    const overlayOpacity = interpolatorProps.current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: ([0, 0.7]: number[]), // Flow...
      extrapolate: 'clamp',
    });
    return {
      ...baseCardStyleInterpolator,
      overlayStyle: [
        baseCardStyleInterpolator.overlayStyle,
        { opacity: overlayOpacity },
      ],
    };
  },
};

export { defaultStackScreenOptions, transitionPreset };
