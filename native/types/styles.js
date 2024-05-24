// @flow

import * as React from 'react';
import { View, Text, Image } from 'react-native';
import Animated, {
  type ReanimatedAnimationBuilder,
  type EntryExitAnimationFunction,
  type SharedValue,
} from 'react-native-reanimated';

import type { ViewStyleObj } from './react-native.js';

type ViewProps = React.ElementConfig<typeof View>;
export type ViewStyle = $PropertyType<ViewProps, 'style'>;

type TextProps = React.ElementConfig<typeof Text>;
export type TextStyle = $PropertyType<TextProps, 'style'>;

type ImageProps = React.ElementConfig<typeof Image>;
export type ImageStyle = $PropertyType<ImageProps, 'style'>;

type Value = ?number | Animated.Node | SharedValue<number>;

export type ReanimatedTransform = {
  +scale?: Value,
  +translateX?: Value,
  +translateY?: Value,
  ...
};

export type WritableAnimatedStyleObj = {
  ...ViewStyleObj,
  opacity?: Value,
  height?: Value,
  width?: Value,
  marginTop?: Value,
  marginRight?: Value,
  marginLeft?: Value,
  backgroundColor?: ?string | Animated.Node | SharedValue<string>,
  bottom?: Value,
  transform?: $ReadOnlyArray<ReanimatedTransform>,
  ...
};

export type AnimatedStyleObj = $ReadOnly<WritableAnimatedStyleObj>;

export type AnimatedViewStyle =
  | AnimatedStyleObj
  | $ReadOnlyArray<ViewStyle | AnimatedStyleObj>;
const AnimatedView: React.ComponentType<{
  ...$Diff<ViewProps, { style: ViewStyle }>,
  +style: AnimatedViewStyle,
  +entering?:
    | ReanimatedAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe,
  +exiting?: ReanimatedAnimationBuilder | EntryExitAnimationFunction | Keyframe,
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
