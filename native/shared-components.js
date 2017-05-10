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
} from 'react-native';
import PropTypes from 'prop-types';

class Button extends React.PureComponent {

  props: {
    onSubmit: () => void,
    disabled?: bool,
    style?: StyleObj,
    children?: React.Element<any>,
  };
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: ViewPropTypes.style,
    children: PropTypes.object,
  };

  render() {
    if (Platform.OS === "android") {
      return (
        <TouchableNativeFeedback
          onPress={this.props.onSubmit}
          disabled={!!this.props.disabled}
        >
          <View style={this.props.style}>
            {this.props.children}
          </View>
        </TouchableNativeFeedback>
      );
    } else {
      return (
        <TouchableHighlight
          onPress={this.props.onSubmit}
          style={this.props.style}
          underlayColor="#CCCCCCDD"
          disabled={!!this.props.disabled}
        >
          {this.props.children}
        </TouchableHighlight>
      );
    }
  }

}

export {
  Button,
};
