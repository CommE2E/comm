// @flow

import * as React from 'react';
import { Platform } from 'react-native';

import { useStyles } from '../themes/colors.js';
import SWMansionIcon from './swmansion-icon.react.js';

function PencilIcon(): React.Node {
  const styles = useStyles(unboundStyles);
  return <SWMansionIcon name="edit-1" size={20} style={styles.editIcon} />;
}

const unboundStyles = {
  editIcon: {
    color: 'modalForegroundSecondaryLabel',
    lineHeight: 20,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
};

export default PencilIcon;
