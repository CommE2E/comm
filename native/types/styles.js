// @flow

import * as React from 'react';
import { View, Text, Image } from 'react-native';

type ViewProps = React.ElementProps<typeof View>;
type ViewStyle = $PropertyType<ViewProps, 'style'>;

type TextProps = React.ElementProps<typeof Text>;
type TextStyle = $PropertyType<TextProps, 'style'>;

type ImageProps = React.ElementProps<typeof Image>;
type ImageStyle = $PropertyType<ImageProps, 'style'>;

export type {
  ViewStyle,
  TextStyle,
  ImageStyle,
};
