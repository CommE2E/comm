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
};

const Tabs = {
  All: 'ALL',
  Images: 'IMAGES',
  Videos: 'VIDEOS',
};

type FilterBarProps = {
  +setActiveTab: (tab: string) => void,
  +activeTab: string,
};

function FilterBar(props: FilterBarProps): React.Node {
  const styles = useStyles(unboundStyles);
  const { setActiveTab, activeTab } = props;

  const tabStyles = React.useCallback(
    (currentTab: string) => {
      return currentTab === activeTab ? styles.tabActiveItem : styles.tabItem;
    },
    [activeTab, styles],
  );

  const filterBar = React.useMemo(() => {
    return (
      <View style={styles.filterBar}>
        <View style={styles.tabNavigator}>
          <TouchableOpacity
            key={Tabs.All}
            style={tabStyles(Tabs.All)}
            onPress={() => setActiveTab(Tabs.All)}
          >
            <Text style={styles.tabText}>{Tabs.All}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            key={Tabs.Images}
            style={tabStyles(Tabs.Images)}
            onPress={() => setActiveTab(Tabs.Images)}
          >
            <Text style={styles.tabText}>{Tabs.Images}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            key={Tabs.Videos}
            style={tabStyles(Tabs.Videos)}
            onPress={() => setActiveTab(Tabs.Videos)}
          >
            <Text style={styles.tabText}>{Tabs.Videos}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [setActiveTab, tabStyles, styles]);

  return filterBar;
}

type FullScreenThreadMediaGalleryProps = {
  +navigation: ChatNavigationProp<'FullScreenThreadMediaGallery'>,
  +route: NavigationRoute<'FullScreenThreadMediaGallery'>,
};

function FullScreenThreadMediaGallery(
  props: FullScreenThreadMediaGalleryProps,
): React.Node {
  const { threadInfo } = props.route.params;
  const { id } = threadInfo;
  const styles = useStyles(unboundStyles);

  const [activeTab, setActiveTab] = React.useState(Tabs.All);
  const flatListContainerRef = React.useRef<?React.ElementRef<typeof View>>();
  const [verticalBounds, setVerticalBounds] = React.useState<?VerticalBounds>(
    null,
  );

  const onFlatListContainerLayout = React.useCallback(() => {
    if (!flatListContainerRef.current) {
      return;
    }

    flatListContainerRef.current.measure(
      (x, y, width, height, pageX, pageY) => {
        if (
          height === null ||
          height === undefined ||
          pageY === null ||
          pageY === undefined
        ) {
          return;
        }
        setVerticalBounds({ height, y: pageY });
      },
    );
  }, [flatListContainerRef]);

  return (
    <View
      style={styles.container}
      ref={flatListContainerRef}
      onLayout={onFlatListContainerLayout}
    >
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

const MemoizedFullScreenMediaGallery: React.ComponentType<FullScreenThreadMediaGalleryProps> = React.memo(
  FullScreenThreadMediaGallery,
);

export default MemoizedFullScreenMediaGallery;
