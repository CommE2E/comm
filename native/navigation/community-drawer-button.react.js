// @flow

import Icon from '@expo/vector-icons/Feather.js';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors.js';
import type { CommunityDrawerNavigationProp } from './community-drawer-navigator.react.js';

type Props = {
  +navigation: CommunityDrawerNavigationProp<'TabNavigator'>,
};
function CommunityDrawerButton(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { navigation } = props;

  return (
    <TouchableOpacity onPress={navigation.openDrawer}>
      <Icon name="menu" size={26} style={styles.drawerButton} />
    </TouchableOpacity>
  );
}

const unboundStyles = {
  drawerButton: {
    color: 'listForegroundSecondaryLabel',
    marginLeft: 16,
  },
};

export default CommunityDrawerButton;
