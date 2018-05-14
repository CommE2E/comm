// @flow

import type {
  ____ImageStyleProp_Internal as ImageStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import * as React from 'react';
import { TouchableWithoutFeedback, Image, StyleSheet } from 'react-native';

type Props = {|
  onPress: () => Promise<void>,
  style?: ImageStyle,
|};
function OnePasswordButton(props: Props) {
  return (
    <TouchableWithoutFeedback onPress={props.onPress}>
      <Image
        source={require("../img/onepassword.png")}
        style={[styles.image, props.style]}
      />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 24,
    height: 24,
    opacity: 0.6,
  },
});

export default OnePasswordButton;
