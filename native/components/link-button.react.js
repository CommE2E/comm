// @flow

import type { ViewStyle } from '../types/styles';

import React from 'react';
import { Text, StyleSheet, Platform, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';

import Button from './button.react';

type Props = {
  text: string,
  onPress: () => void,
  disabled?: bool,
  style?: ViewStyle,
};
class LinkButton extends React.PureComponent<Props> {

  static propTypes = {
    text: PropTypes.string.isRequired,
    onPress: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: ViewPropTypes.style,
  };

  render() {
    const disabledStyle = this.props.disabled ? styles.disabled : null;
    return (
      <Button
        onPress={this.props.onPress}
        androidBorderlessRipple={true}
        iosActiveOpacity={0.85}
        disabled={!!this.props.disabled}
        style={this.props.style}
      >
        <Text style={[styles.text, disabledStyle]}>{this.props.text}</Text>
      </Button>
    );
  }

}

const styles = StyleSheet.create({
  text: {
    fontSize: 17,
    paddingHorizontal: 10,
    color: Platform.select({
      ios: '#037AFF',
      android: '#0077CC',
    }),
    fontWeight: Platform.select({ android: 'bold' }),
  },
  disabled: {
    color: "#AAAAAA",
  },
});

export default LinkButton;
