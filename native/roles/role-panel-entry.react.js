// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';

type RolePanelEntryProps = {
  +roleName: string,
  +memberCount: number,
};

function RolePanelEntry(props: RolePanelEntryProps): React.Node {
  const { roleName, memberCount } = props;
  const styles = useStyles(unboundStyles);

  const menuButton = React.useMemo(() => {
    if (roleName === 'Admins') {
      return <View style={styles.rolePanelEmptyMenuButton} />;
    }
    return (
      <TouchableOpacity>
        <SWMansionIcon
          name="menu-horizontal"
          size={22}
          style={styles.rolePanelMenuButton}
        />
      </TouchableOpacity>
    );
  }, [roleName, styles.rolePanelEmptyMenuButton, styles.rolePanelMenuButton]);

  return (
    <View style={styles.rolePanelEntry}>
      <Text style={styles.rolePanelNameEntry}>{roleName}</Text>
      <View style={styles.rolePanelCountEntryContainer}>
        <Text style={styles.rolePanelCountEntry}>
          {memberCount}
          <CommIcon name="user-filled" size={14} />
        </Text>
      </View>
      {menuButton}
    </View>
  );
}

const unboundStyles = {
  rolePanelEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  rolePanelNameEntry: {
    flex: 1,
    color: 'panelForegroundLabel',
    fontWeight: '600',
    fontSize: 14,
  },
  rolePanelCountEntryContainer: {
    marginRight: 40,
    alignItmes: 'flex-end',
  },
  rolePanelCountEntry: {
    color: 'panelForegroundLabel',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 22,
    padding: 8,
  },
  rolePanelEmptyMenuButton: {
    marginRight: 22,
  },
  rolePanelMenuButton: {
    color: 'panelForegroundLabel',
  },
};

export default RolePanelEntry;
