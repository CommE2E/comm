// @flow

import Icon from '@expo/vector-icons/Feather.js';
import * as React from 'react';
import { View } from 'react-native';

import { useStyles } from '../themes/colors.js';

// eslint-disable-next-line no-unused-vars
export default function CommunityDrawerButtonIcon(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.background}>
      <Icon name="menu" size={26} style={styles.drawerButton} />
    </View>
  );
}

const unboundStyles = {
  drawerButton: {
    color: 'listForegroundSecondaryLabel',
    padding: 6,
  },
  background: {
    marginLeft: 10,
    backgroundColor: 'tabBarBackground',
  },
};
