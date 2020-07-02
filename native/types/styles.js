// @flow

import * as React from 'react';
import { View, Text, Image } from 'react-native';

type ViewProps = React.ElementConfig<typeof View>;
type ViewStyle = $PropertyType<ViewProps, 'style'>;

type TextProps = React.ElementConfig<typeof Text>;
type TextStyle = $PropertyType<TextProps, 'style'>;

type ImageProps = React.ElementConfig<typeof Image>;
type ImageStyle = $PropertyType<ImageProps, 'style'>;

export type { ViewStyle, TextStyle, ImageStyle };
