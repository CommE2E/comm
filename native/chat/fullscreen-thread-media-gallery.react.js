// @flow

import * as React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types';

import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors';
import type { ChatNavigationProp } from './chat.react';
import ThreadSettingsMediaGallery from './settings/thread-settings-media-gallery.react';

export type FullScreenThreadMediaGalleryParams = {
  +threadInfo: ThreadInfo,
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
  const { id } = props.route.params.threadInfo;

  const [activeTab, setActiveTab] = React.useState(TABS.ALL);

  return (
    <View>
      <FilterBar setActiveTab={setActiveTab} activeTab={activeTab} />
      <ThreadSettingsMediaGallery
        threadID={id}
        limit={21}
        offset={0}
        activeTab={activeTab}
      />
    </View>
  );
}

const unboundStyles = {
  filterBar: {
    marginTop: 20,
    marginBottom: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  tabNavigator: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 0,
    position: 'absolute',
    width: '90%',
  },
  tabActiveItem: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'floatingButtonBackground',
    height: 30,
    borderRadius: 8,
  },
  tabItem: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    height: 30,
  },
  tabText: {
    color: 'floatingButtonLabel',
  },
};

export default FullScreenThreadMediaGallery;
