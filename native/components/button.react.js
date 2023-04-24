// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  Platform,
  View,
  TouchableNativeFeedback,
  TouchableHighlight,
  TouchableOpacity,
} from 'react-native';

import type { ViewStyle } from '../types/styles.js';

const ANDROID_VERSION_LOLLIPOP = 21;

type DefaultProps = {
  +androidBorderlessRipple: boolean,
  +iosFormat: 'highlight' | 'opacity',
  +iosActiveOpacity: number,
  +androidFormat: 'ripple' | 'highlight' | 'opacity',
};
type Props = {
  ...DefaultProps,
  +onPress: () => mixed,
  +disabled?: boolean,
  +style?: ViewStyle,
  // style and topStyle just get merged in most cases. The separation only
  // matters in the case of iOS and iosFormat = "highlight", where the
  // topStyle is necessary for layout, and the bottom style is necessary for
  // colors etc.
  +topStyle?: ViewStyle,
  +children?: React.Node,
  +iosHighlightUnderlayColor?: string,
};
class Button extends React.PureComponent<Props> {
  static defaultProps: DefaultProps = {
    androidBorderlessRipple: false,
    iosFormat: 'opacity',
    androidFormat: 'ripple',
    iosActiveOpacity: 0.2,
  };

  render(): React.Node {
    if (
      Platform.OS === 'android' &&
      this.props.androidFormat === 'ripple' &&
      Platform.Version >= ANDROID_VERSION_LOLLIPOP
    ) {
      return (
        <TouchableNativeFeedback
          onPress={this.props.onPress}
          disabled={!!this.props.disabled}
          background={TouchableNativeFeedback.Ripple(
            'rgba(0, 0, 0, .32)',
            this.props.androidBorderlessRipple,
          )}
        >
          <View style={[this.props.topStyle, this.props.style]}>
            {this.props.children}
          </View>
        </TouchableNativeFeedback>
      );
    }
    let format = 'opacity';
    if (Platform.OS === 'ios') {
      format = this.props.iosFormat;
    } else if (
      Platform.OS === 'android' &&
      this.props.androidFormat !== 'ripple'
    ) {
      format = this.props.androidFormat;
    }
    if (format === 'highlight') {
      const underlayColor = this.props.iosHighlightUnderlayColor;
      invariant(
        underlayColor,
        'iosHighlightUnderlayColor should be specified to Button in ' +
          "format='highlight'",
      );
      return (
        <TouchableHighlight
          onPress={this.props.onPress}
          style={this.props.topStyle}
          underlayColor={underlayColor}
          activeOpacity={this.props.iosActiveOpacity}
          disabled={!!this.props.disabled}
        >
          <View style={this.props.style}>{this.props.children}</View>
        </TouchableHighlight>
      );
    } else {
      return (
        <TouchableOpacity
          onPress={this.props.onPress}
          style={[this.props.topStyle, this.props.style]}
          activeOpacity={this.props.iosActiveOpacity}
          disabled={!!this.props.disabled}
        >
          {this.props.children}
        </TouchableOpacity>
      );
    }
  }
}

export default Button;
