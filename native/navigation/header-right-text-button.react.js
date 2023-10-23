// @flow

import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors.js';

type Props = {
  +label: string,
  +onPress: () => mixed,
};

function HeaderRightTextButton(props: Props): React.Node {
  const { label, onPress } = props;

  const styles = useStyles(unboundStyles);

  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={styles.textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  textStyle: {
    color: 'purpleLink',
    fontSize: 16,
    marginRight: 10,
  },
};

export default HeaderRightTextButton;
