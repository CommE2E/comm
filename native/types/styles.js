// @flow

import * as React from 'react';
import { View, Text, Image } from 'react-native';
import Animated, {
  type ReanimatedAnimationBuilder,
  type EntryAnimationFunction,
  type ExitAnimationFunction,
  type SharedValue,
} from 'react-native-reanimated';

import type { ViewStyleObj } from './react-native.js';

type ViewProps = React.ElementConfig<typeof View>;
export type ViewStyle = ViewProps['style'];

type TextProps = React.ElementConfig<typeof Text>;
export type TextStyle = TextProps['style'];

type ImageProps = React.ElementConfig<typeof Image>;
export type ImageStyle = ImageProps['style'];

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
  ...Omit<ViewProps, 'style'>,
  +style: AnimatedViewStyle,
  +entering?: ReanimatedAnimationBuilder | EntryAnimationFunction | Keyframe,
  +exiting?: ReanimatedAnimationBuilder | ExitAnimationFunction | Keyframe,
}> = Animated.View;

export type AnimatedTextStyle =
  | AnimatedStyleObj
  | $ReadOnlyArray<TextStyle | AnimatedStyleObj>;
const AnimatedText: React.ComponentType<{
  ...Omit<TextProps, 'style'>,
  +style: AnimatedTextStyle,
}> = Animated.Text;

export type AnimatedImageStyle =
  | AnimatedStyleObj
  | $ReadOnlyArray<ImageStyle | AnimatedStyleObj>;
const AnimatedImage: React.ComponentType<{
  ...Omit<ImageProps, 'style'>,
  +style: AnimatedImageStyle,
}> = Animated.Image;

export { AnimatedView, AnimatedText, AnimatedImage };
