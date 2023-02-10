// @flow

import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import SWMansionIcon from '../../components/swmansion-icon.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +onPress: () => void,
};
function SaveSettingButton(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <TouchableOpacity onPress={props.onPress}>
      <SWMansionIcon name="check-circle" size={20} style={styles.saveIcon} />
    </TouchableOpacity>
  );
}

const unboundStyles = {
  saveIcon: {
    color: 'modalForegroundSecondaryLabel',
  },
};

export default SaveSettingButton;
