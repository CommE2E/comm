// @flow

import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  color: string,
  size?: 'large' | 'small',
};
function ColorSplotch(props: Props) {
  const style = [
    styles.splotch,
    props.size === 'small' ? styles.small : styles.large,
    { backgroundColor: `#${props.color}` },
  ];
  return <View style={style} />;
}

const styles = StyleSheet.create({
  large: {
    height: 25,
    width: 25,
  },
  small: {
    height: 18,
    width: 18,
  },
  splotch: {
    borderRadius: 5,
  },
});

export default ColorSplotch;
