// @flow

import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors.js';

type Props = {
  +onPress: () => mixed,
};

function HeaderRightAddButton(props: Props): React.Node {
  const { onPress } = props;

  const styles = useStyles(unboundStyles);

  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={styles.textStyle}>Add</Text>
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

export default HeaderRightAddButton;
