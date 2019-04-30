// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';

import { contentBottomOffset } from '../selectors/dimension-selectors';

class ImageGalleryKeyboard extends React.PureComponent<{||}> {

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.onPress}>
          <Text style={styles.text}>HELOOOO!!!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  onPress = () => {
    KeyboardRegistry.onItemSelected(imageGalleryKeyboardName, {});
  }

}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: -contentBottomOffset,
    left: 0,
    right: 0,
  },
  text: {
    color: 'red',
  },
});

const imageGalleryKeyboardName = 'ImageGalleryKeyboard';

KeyboardRegistry.registerKeyboard(
  imageGalleryKeyboardName,
  () => ImageGalleryKeyboard,
);

export {
  imageGalleryKeyboardName,
};
