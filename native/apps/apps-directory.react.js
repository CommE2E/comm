// @flow

import * as React from 'react';
import { Text, FlatList, View } from 'react-native';

import type { SupportedApps } from 'lib/types/enabled-apps.js';

import AppListing from './app-listing.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Item = {
  +id: SupportedApps | 'chat',
  +alwaysEnabled: boolean,
  +appName: string,
  +appIcon: 'message-square' | 'calendar',
  +appCopy: string,
};

const APP_DIRECTORY_DATA: $ReadOnlyArray<Item> = [
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

type Props = {
  +navigation: TabNavigationProp<'Apps'>,
  +route: NavigationRoute<'Apps'>,
};
// eslint-disable-next-line no-unused-vars
function AppsDirectory(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const enabledApps = useSelector(state => state.enabledApps);

  const renderAppCell = React.useCallback(
    ({ item }: { +item: Item, ... }) => (
      <AppListing
        id={item.id}
        enabled={item.id === 'chat' ? true : enabledApps[item.id]}
        alwaysEnabled={item.alwaysEnabled}
        appName={item.appName}
        appIcon={item.appIcon}
        appCopy={item.appCopy}
      />
    ),
    [enabledApps],
  );
  const getItemID = React.useCallback((item: Item) => item.id, []);

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
