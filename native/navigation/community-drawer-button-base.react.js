// @flow

import Icon from '@expo/vector-icons/Feather.js';
import * as React from 'react';

import { useStyles } from '../themes/colors.js';

// eslint-disable-next-line no-unused-vars
export default function CommunityDrawerButtonBase(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  return <Icon name="menu" size={26} style={styles.drawerButton} />;
}

const unboundStyles = {
  drawerButton: {
    color: 'listForegroundSecondaryLabel',
    marginLeft: 16,
  },
};
