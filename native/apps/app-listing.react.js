// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { useStyles } from '../themes/colors';

type Props = {|
  +active: boolean,
  +appName: string,
  +appIcon: 'calendar' | 'book' | 'tasks' | 'folder',
  +appCopy: string,
|};
function AppListing(props: Props) {
  const { active, appName, appIcon, appCopy } = props;
  const styles = useStyles(unboundStyles);
  const textColor = active ? 'white' : 'gray';
  return (
    <View style={styles.cell}>
      <View style={styles.appContent}>
        <Icon name={appIcon} style={[styles.appIcon, { color: textColor }]} />
        <View>
          <Text style={[styles.appName, { color: textColor }]}>{appName}</Text>
          <Text style={[styles.appCopy, { color: textColor }]}>{appCopy}</Text>
        </View>
      </View>

      <TouchableOpacity>
        <Icon name="plus" style={[styles.plusIcon, { color: textColor }]} />
      </TouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  cell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  appContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    fontSize: 28,
    paddingRight: 18,
  },
  plusIcon: {
    fontSize: 20,
  },
  appName: {
    fontSize: 20,
  },
  appCopy: {
    fontSize: 12,
  },
};

export default AppListing;
