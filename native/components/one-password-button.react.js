// @flow

import type { ImageStyle } from '../types/styles';
import type { GlobalTheme } from '../types/themes';

import * as React from 'react';
import { TouchableWithoutFeedback, Image, StyleSheet } from 'react-native';

type Props = {|
  onPress: () => Promise<void>,
  theme: GlobalTheme,
  style?: ImageStyle,
|};
function OnePasswordButton(props: Props) {
  let source;
  if (props.theme === 'dark') {
    source = require('../img/onepassword-light.png');
  } else {
    source = require('../img/onepassword-dark.png');
  }
  return (
    <TouchableWithoutFeedback onPress={props.onPress}>
      <Image source={source} style={[styles.image, props.style]} />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  image: {
    height: 24,
    opacity: 0.6,
    width: 24,
  },
});

export default OnePasswordButton;
