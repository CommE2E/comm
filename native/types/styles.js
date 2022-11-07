// @flow

import * as React from 'react';
import { View, Text, Image } from 'react-native';
import Animated, {
  type BaseAnimationBuilder,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

type ViewProps = React.ElementConfig<typeof View>;
export type ViewStyle = $PropertyType<ViewProps, 'style'>;

type TextProps = React.ElementConfig<typeof Text>;
export type TextStyle = $PropertyType<TextProps, 'style'>;

type ImageProps = React.ElementConfig<typeof Image>;
export type ImageStyle = $PropertyType<ImageProps, 'style'>;

export type AnimatedStyleObj = {
  +opacity?: ?number | Animated.Node,
  +width?: ?number | Animated.Node,
  +marginRight?: ?number | Animated.Node,
  +transform?: $ReadOnlyArray<{
    +scale?: ?number | Animated.Node,
    ...
  }>,
  ...
};

export type AnimatedViewStyle =
  | AnimatedStyleObj
  | $ReadOnlyArray<ViewStyle | AnimatedStyleObj>;
const AnimatedView: React.ComponentType<{
  ...$Diff<ViewProps, { style: ViewStyle }>,
  +style: AnimatedViewStyle,
  +entering?: BaseAnimationBuilder | EntryExitAnimationFunction | Keyframe,
  +exiting?: BaseAnimationBuilder | EntryExitAnimationFunction | Keyframe,
}> = Animated.View;

export type AnimatedTextStyle =
  | AnimatedStyleObj
  | $ReadOnlyArray<TextStyle | AnimatedStyleObj>;
const AnimatedText: React.ComponentType<{
  ...$Diff<TextProps, { style: TextStyle }>,
  +style: AnimatedTextStyle,
}> = Animated.Text;

export type AnimatedImageStyle =
  | AnimatedStyleObj
  | $ReadOnlyArray<ImageStyle | AnimatedStyleObj>;
const AnimatedImage: React.ComponentType<{
  ...$Diff<ImageProps, { style: ImageStyle }>,
  +style: AnimatedImageStyle,
}> = Animated.Image;

export { AnimatedView, AnimatedText, AnimatedImage };
