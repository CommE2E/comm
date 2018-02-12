// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import * as React from 'react';
import {
  Platform,
  View,
  TouchableNativeFeedback,
  TouchableHighlight,
  ViewPropTypes,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';

const ANDROID_VERSION_LOLLIPOP = 21;

type Props = {
  onPress: () => *,
  disabled?: bool,
  style?: StyleObj,
  // style and topStyle just get merged in most cases. The separation only
  // matters in the case of iOS and iosFormat = "highlight", where the
  // topStyle is necessary for layout, and the bottom style is necessary for
  // colors etc.
  topStyle?: StyleObj,
  children?: React.Node,
  androidBorderlessRipple: bool,
  iosFormat: "highlight" | "opacity",
  iosHighlightUnderlayColor: string,
  iosActiveOpacity: number,
};
class Button extends React.PureComponent<Props> {

  static propTypes = {
    onPress: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: ViewPropTypes.style,
    topStyle: ViewPropTypes.style,
    children: PropTypes.node,
    androidBorderlessRipple: PropTypes.bool,
    iosFormat: PropTypes.oneOf([
      "highlight",
      "opacity",
    ]),
    iosHighlightUnderlayColor: PropTypes.string,
    iosActiveOpacity: PropTypes.number,
  };
  static defaultProps = {
    androidBorderlessRipple: false,
    iosFormat: "opacity",
    iosHighlightUnderlayColor: "#CCCCCCDD",
    iosActiveOpacity: 0.2,
  };

  render() {
    if (
      Platform.OS === "android" &&
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
    } else if (this.props.iosFormat === "highlight") {
      const underlayColor = this.props.iosHighlightUnderlayColor;
      const child = this.props.children ? this.props.children : <View />;
      return (
        <TouchableHighlight
          onPress={this.props.onPress}
          style={this.props.topStyle}
          underlayColor={underlayColor}
          activeOpacity={this.props.iosActiveOpacity}
          disabled={!!this.props.disabled}
        >
          <View style={this.props.style}>
            {this.props.children}
          </View>
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
