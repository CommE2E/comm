// @flow

import * as React from 'react';
import { Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStyles } from '../themes/colors';
import AppListing from './app-listing.react';

const safeAreaEdges = ['top', 'bottom'];
const APP_DIRECTORY_DATA = [
  {
    id: '0',
    active: true,
    appName: 'Calendar',
    appIcon: 'calendar',
    appCopy: 'Shared calendar for you and your community',
  },
  {
    id: '1',
    active: false,
    appName: 'Wiki',
    appIcon: 'book',
    appCopy: 'Connect your community mail account',
  },
  {
    id: '2',
    active: false,
    appName: 'Tasks',
    appIcon: 'tasks',
    appCopy: 'Shared tasks for you and your community',
  },
  {
    id: '3',
    active: false,
    appName: 'Files',
    appIcon: 'folder',
    appCopy: 'Shared files for you and your community',
  },
];

function AppsDirectory() {
  const styles = useStyles(unboundStyles);

  const renderAppCell = React.useCallback(
    ({ item }) => (
      <AppListing
        active={item.active}
        appName={item.appName}
        appIcon={item.appIcon}
        appCopy={item.appCopy}
      />
    ),
    [],
  );
  const getItemID = React.useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.view} edges={safeAreaEdges}>
      <Text style={styles.title}>Choose Apps</Text>
      <FlatList
        data={APP_DIRECTORY_DATA}
        renderItem={renderAppCell}
        keyExtractor={getItemID}
      />
    </SafeAreaView>
  );
}

const unboundStyles = {
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
    padding: 18,
  },
  title: {
    color: 'white',
    fontSize: 28,
    paddingVertical: 12,
  },
};

export default AppsDirectory;
