// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';

class ImageGalleryKeyboard extends React.PureComponent<{||}> {

  render() {
    return (
      <TouchableOpacity onPress={this.onPress}>
        <Text style={styles.text}>HELOOOO!!!</Text>
      </TouchableOpacity>
    );
  }

  onPress = () => {
    KeyboardRegistry.onItemSelected(imageGalleryKeyboardName, {});
  }

}

const styles = StyleSheet.create({
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
