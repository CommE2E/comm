// @flow

import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';

import Button from '../components/button.react';

class CreateThreadButton extends React.PureComponent {

  props: {
    onPress: () => void,
  };
  static propTypes = {
    onPress: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Button onSubmit={this.props.onPress} defaultFormat="opacity">
        <Text style={styles.text}>Create</Text>
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

export default CreateThreadButton;
