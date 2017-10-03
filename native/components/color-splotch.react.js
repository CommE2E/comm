// @flow

import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  color: string,
  size?: "large" | "small",
};
function ColorSplotch(props: Props) {
  const style = [
    styles.splotch,
    props.size === "small"
      ? styles.small
      : styles.large,
    { backgroundColor: `#${props.color}` },
  ];
  return <View style={style} />;
}

const styles = StyleSheet.create({
  splotch: {
    borderRadius: 5,
  },
  small: {
    height: 18,
    width: 18,
  },
  large: {
    height: 25,
    width: 25,
  },
});

export default ColorSplotch;
