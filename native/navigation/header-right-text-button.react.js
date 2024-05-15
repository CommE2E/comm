// @flow

import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors.js';

type Props = {
  +label: string,
  +onPress: () => mixed,
  +disabled?: boolean,
};

function HeaderRightTextButton(props: Props): React.Node {
  const { label, onPress, disabled } = props;

  const styles = useStyles(unboundStyles);
  const textStyle = disabled ? styles.disabledTextStyle : styles.textStyle;

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  textStyle: {
    color: 'purpleLink',
    fontSize: 16,
    marginRight: 10,
  },
  disabledTextStyle: {
    color: 'disabledButtonText',
    fontSize: 16,
    marginRight: 10,
  },
};

export default HeaderRightTextButton;
