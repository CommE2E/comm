// @flow

import * as React from 'react';
import { Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

type HeaderCloseLeftButtonProps = {
  +onPress?: () => mixed,
  +style?: ViewStyle,
};
function HeaderCloseLeftButton(props: HeaderCloseLeftButtonProps): React.Node {
  const { onPress, style } = props;
  const styles = useStyles(unboundStyles);
  return (
    <TouchableOpacity style={style} onPress={onPress}>
      <Text style={styles.closeIcon}>×</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  closeIcon: {
    color: 'white',
    fontSize: 36,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
};

export default HeaderCloseLeftButton;
