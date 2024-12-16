// @flow

import Icon from '@expo/vector-icons/MaterialCommunityIcons.js';
import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import * as React from 'react';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { useStyles } from '../../themes/colors.js';

type QRCodeScannerLeftButtonProps = React.ElementConfig<
  typeof BaseHeaderBackButton,
>;
function QRCodeScannerLeftButton(
  props: QRCodeScannerLeftButtonProps,
): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Icon name="close" size={36} style={styles.closeButton} />
    </TouchableOpacity>
  );
}

const unboundStyles = {
  closeButton: {
    marginLeft: 10,
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
};

export default QRCodeScannerLeftButton;
