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
    underlayColor?: string,
    children?: React.Element<any>,
    defaultFormat: "highlight" | "opacity",
  };
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: ViewPropTypes.style,
    underlayColor: PropTypes.string,
    children: PropTypes.object,
    defaultFormat: PropTypes.oneOf([
      "highlight",
      "opacity",
    ]),
  };
  static defaultProps = {
    defaultFormat: "highlight",
  };

  render() {
    if (Platform.OS === "android") {
      return (
        <TouchableNativeFeedback
          onPress={this.props.onSubmit}
          disabled={!!this.props.disabled}
          background={TouchableNativeFeedback.Ripple(
            'rgba(0, 0, 0, .32)',
            true,
          )}
        >
          <View style={this.props.style}>
            {this.props.children}
          </View>
        </TouchableNativeFeedback>
      );
    } else if (this.props.defaultFormat === "highlight") {
      const underlayColor = this.props.underlayColor
        ? this.props.underlayColor
        : "#CCCCCCDD";
      return (
        <TouchableHighlight
          onPress={this.props.onSubmit}
          style={this.props.style}
          underlayColor={underlayColor}
          disabled={!!this.props.disabled}
        >
          {this.props.children}
        </TouchableHighlight>
      );
    } else {
      return (
        <TouchableOpacity
          onPress={this.props.onSubmit}
          style={this.props.style}
          disabled={!!this.props.disabled}
        >
          {this.props.children}
        </TouchableOpacity>
      );
    }
  }

}

export default Button;
