// @flow

import * as React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { ChatNavigationProp } from './chat.react.js';
import ThreadSettingsMediaGallery from './settings/thread-settings-media-gallery.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { VerticalBounds } from '../types/layout-types.js';

export type FullScreenThreadMediaGalleryParams = {
  +threadInfo: ThreadInfo,
  +verticalBounds: ?VerticalBounds,
};

const TABS = {
  ALL: 'ALL',
  IMAGES: 'IMAGES',
  VIDEOS: 'VIDEOS',
};

type FilterBarProps = {
  +setActiveTab: (tab: string) => void,
  +activeTab: string,
};

function FilterBar(props: FilterBarProps): React.Node {
  const styles = useStyles(unboundStyles);
  const { setActiveTab, activeTab } = props;

  const filterBar = React.useMemo(() => {
    return (
      <View style={styles.filterBar}>
        <View style={styles.tabNavigator}>
          {Object.values(TABS).map(tab => (
            <TouchableOpacity
              key={String(tab)}
              style={activeTab === tab ? styles.tabActiveItem : styles.tabItem}
              onPress={() => setActiveTab(String(tab))}
            >
              <Text style={styles.tabText}>{String(tab)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [activeTab, setActiveTab, styles]);

  return filterBar;
}

type FullScreenThreadMediaGalleryProps = {
  +navigation: ChatNavigationProp<'FullScreenThreadMediaGallery'>,
  +route: NavigationRoute<'FullScreenThreadMediaGallery'>,
};

function FullScreenThreadMediaGallery(
  props: FullScreenThreadMediaGalleryProps,
): React.Node {
  const { threadInfo, verticalBounds } = props.route.params;
  const { id } = threadInfo;
  const styles = useStyles(unboundStyles);

  const [activeTab, setActiveTab] = React.useState(TABS.ALL);

  return (
    <View style={styles.container}>
      <FilterBar setActiveTab={setActiveTab} activeTab={activeTab} />
      <ThreadSettingsMediaGallery
        threadID={id}
        verticalBounds={verticalBounds}
        limit={21}
        offset={0}
        activeTab={activeTab}
      />
    </View>
  );
}

const unboundStyles = {
  container: {
    marginBottom: 120,
  },
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  tabNavigator: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'absolute',
    width: '90%',
    padding: 0,
  },
  tabActiveItem: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'floatingButtonBackground',
    flex: 1,
    height: 30,
    borderRadius: 8,
  },
  tabItem: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'tabBarInactiveBackground',
    flex: 1,
    height: 30,
  },
  tabText: {
    color: 'floatingButtonLabel',
  },
};

export default FullScreenThreadMediaGallery;
