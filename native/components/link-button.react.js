// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import { Text, StyleSheet, Platform, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';

import Button from './button.react';

type Props = {
  text: string,
  onPress: () => void,
  style?: StyleObj,
};
class LinkButton extends React.PureComponent<Props> {

  static propTypes = {
    text: PropTypes.string.isRequired,
    onPress: PropTypes.func.isRequired,
    style: ViewPropTypes.style,
  };

  render() {
    return (
      <Button
        onPress={this.props.onPress}
        androidBorderlessRipple={true}
        iosActiveOpacity={0.85}
        style={this.props.style}
      >
        <Text style={styles.text}>{this.props.text}</Text>
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
});

export default LinkButton;
