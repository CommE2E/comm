// @flow

import * as React from 'react';
import { Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { useStyles } from '../themes/colors';
import AppListing from './app-listing.react';

const safeAreaEdges = ['top', 'bottom'];
const APP_DIRECTORY_DATA = [
  {
    id: 'calendar',
    available: true,
    appName: 'Calendar',
    appIcon: 'calendar',
    appCopy: 'Shared calendar for your community',
  },
  {
    id: 'wiki',
    available: false,
    appName: 'Wiki',
    appIcon: 'document-filled',
    appCopy: 'Shared wiki for your community',
  },
  {
    id: 'tasks',
    available: false,
    appName: 'Tasks',
    appIcon: 'check-round',
    appCopy: 'Shared tasks for your community',
  },
  {
    id: 'files',
    available: false,
    appName: 'Files',
    appIcon: 'package',
    appCopy: 'Shared files for your community',
  },
];

function AppsDirectory() {
  const styles = useStyles(unboundStyles);
  const enabledApps = useSelector(state => state.enabledApps);

  const renderAppCell = React.useCallback(
    ({ item }) => (
      <AppListing
        id={item.id}
        available={item.available}
        enabled={enabledApps[item.id]}
        appName={item.appName}
        appIcon={item.appIcon}
        appCopy={item.appCopy}
      />
    ),
    [enabledApps],
  );
  const getItemID = React.useCallback(item => item.id, []);

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
