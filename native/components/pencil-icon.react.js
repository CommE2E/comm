// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { useStyles } from '../themes/colors';

function PencilIcon() {
  const styles = useStyles(unboundStyles);
  return <Icon name="pencil" size={16} style={styles.editIcon} />;
}

const unboundStyles = {
  editIcon: {
    color: 'link',
    lineHeight: 20,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
};

export default PencilIcon;
