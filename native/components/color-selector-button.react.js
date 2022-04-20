// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

type ColorSelectorButtonProps = {
  color: string,
};

function ColorSelectorButton(props: ColorSelectorButtonProps): React.Node {
  const { color } = props;
  const buttonStyle = React.useMemo(
    () => [styles.button, { backgroundColor: color }],
    [color],
  );
  return <View style={buttonStyle} />;
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    height: 40,
    margin: 15,
    width: 40,
  },
});

export default ColorSelectorButton;
