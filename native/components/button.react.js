// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import {
  Platform,
  View,
  TouchableNativeFeedback,
  TouchableHighlight,
  ViewPropTypes,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';

class Button extends React.PureComponent {

  props: {
    onSubmit: () => void,
    disabled?: bool,
    style?: StyleObj,
    // style and topStyle just get merged in most cases. The separation only
    // matters in the case of iOS and defaultFormat = "highlight", where the
    // topStyle is necessary for layout, and the bottom style is necessary for
    // colors etc.
    topStyle?: StyleObj,
    underlayColor?: string,
    children?: React.Element<any>,
    defaultFormat: "highlight" | "opacity",
    androidBorderlessRipple: bool,
    iosActiveOpacity: number,
  };
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: ViewPropTypes.style,
    topStyle: ViewPropTypes.style,
    underlayColor: PropTypes.string,
    children: PropTypes.object,
    defaultFormat: PropTypes.oneOf([
      "highlight",
      "opacity",
    ]),
    androidBorderlessRipple: PropTypes.bool,
    iosActiveOpacity: PropTypes.number,
  };
  static defaultProps = {
    defaultFormat: "highlight",
    androidBorderlessRipple: true,
    iosActiveOpacity: 0.85,
  };

  render() {
    if (Platform.OS === "android") {
      return (
        <TouchableNativeFeedback
          onPress={this.props.onSubmit}
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
    } else if (this.props.defaultFormat === "highlight") {
      const underlayColor = this.props.underlayColor
        ? this.props.underlayColor
        : "#CCCCCCDD";
      const child = this.props.children ? this.props.children : <View />;
      return (
        <TouchableHighlight
          onPress={this.props.onSubmit}
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
          onPress={this.props.onSubmit}
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
