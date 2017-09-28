// @flow

import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  color: string,
};
function ColorSplotch(props: Props) {
  const style = {
    backgroundColor: `#${props.color}`,
  };
  return (
    <View style={[styles.colorSplotch, style]} />
  );
}

const styles = StyleSheet.create({
  colorSplotch: {
    height: 25,
    width: 25,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#777777',
  },
});

export default ColorSplotch;
