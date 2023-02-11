// @flow

import * as React from 'react';
import { Text, FlatList, View } from 'react-native';
import { useSelector } from 'react-redux';

import AppListing from './app-listing.react.js';
import { useStyles } from '../themes/colors.js';

const APP_DIRECTORY_DATA = [
  {
    id: 'chat',
    alwaysEnabled: true,
    appName: 'Chat',
    appIcon: 'message-square',
    appCopy: 'Keep in touch with your community',
  },
  {
    id: 'calendar',
    alwaysEnabled: false,
    appName: 'Calendar',
    appIcon: 'calendar',
    appCopy: 'Shared calendar for your community',
  },
];

// eslint-disable-next-line no-unused-vars
function AppsDirectory(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  const enabledApps = useSelector(state => state.enabledApps);

  const renderAppCell = React.useCallback(
    ({ item }) => (
      <AppListing
        id={item.id}
        enabled={enabledApps[item.id]}
        alwaysEnabled={item.alwaysEnabled}
        appName={item.appName}
        appIcon={item.appIcon}
        appCopy={item.appCopy}
      />
    ),
    [enabledApps],
  );
  const getItemID = React.useCallback(item => item.id, []);

  return (
    <View style={styles.view}>
      <Text style={styles.title}>Choose Apps</Text>
      <FlatList
        data={APP_DIRECTORY_DATA}
        renderItem={renderAppCell}
        keyExtractor={getItemID}
      />
    </View>
  );
}

const unboundStyles = {
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
    padding: 18,
  },
  title: {
    color: 'modalForegroundLabel',
    fontSize: 28,
    paddingVertical: 12,
  },
};

export default AppsDirectory;
