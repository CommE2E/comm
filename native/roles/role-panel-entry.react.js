// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import CommIcon from '../components/comm-icon.react.js';
import { useStyles } from '../themes/colors.js';

type RolePanelEntryProps = {
  +roleName: string,
  +memberCount: number,
};

function RolePanelEntry(props: RolePanelEntryProps): React.Node {
  const { roleName, memberCount } = props;
  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.rolePanelEntry}>
      <Text style={styles.rolePanelNameEntry}>{roleName}</Text>
      <Text style={styles.rolePanelCountEntry}>
        {memberCount}
        <CommIcon name="user-filled" size={14} />
      </Text>
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
    color: 'panelForegroundLabel',
    fontWeight: '600',
    fontSize: 14,
  },
  rolePanelCountEntry: {
    color: 'panelForegroundLabel',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 72,
    padding: 8,
  },
};

export default RolePanelEntry;
