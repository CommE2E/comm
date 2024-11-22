// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import {
  TabView,
  SceneMap,
  TabBar,
  type TabBarProps,
} from 'react-native-tab-view';

import { useThreadSearchIndex } from 'lib/selectors/nav-selectors.js';
import { threadInfoFromRawThreadInfo } from 'lib/shared/thread-utils.js';
import type { ClientCommunityInfoWithCommunityName } from 'lib/types/community-types.js';

import Modal from './modal.react.js';
import CommunityList from '../components/community-list.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';

export type CommunityJoinerModalParams = {
  +communities: $ReadOnlyArray<ClientCommunityInfoWithCommunityName>,
};

type Props = {
  +navigation: RootNavigationProp<'CommunityJoinerModal'>,
  +route: NavigationRoute<'CommunityJoinerModal'>,
};

const defaultCommunities: $ReadOnlyArray<ClientCommunityInfoWithCommunityName> =
  [];

// This should be updated with the names of the crypto communities on Comm
const cryptoCommunityNames: $ReadOnlyArray<string> = [];

function CommunityJoinerModal(props: Props): React.Node {
  const { params } = props.route;
  const communities = params?.communities ?? defaultCommunities;

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const userInfos = useSelector(state => state.userStore.userInfos);
  const styles = useStyles(unboundStyles);

  const generalCommunities = React.useMemo(
    () =>
      communities.filter(
        community => !cryptoCommunityNames.includes(community.communityName),
      ),
    [communities],
  );
  const cryptoCommunities = React.useMemo(
    () =>
      communities.filter(community =>
        cryptoCommunityNames.includes(community.communityName),
      ),
    [communities],
  );

  const generateThreadInfos = React.useCallback(
    (communityList: $ReadOnlyArray<ClientCommunityInfoWithCommunityName>) =>
      communityList
        .map(community =>
          community.threadInfo
            ? threadInfoFromRawThreadInfo(
                community.threadInfo,
                viewerID,
                userInfos,
              )
            : null,
        )
        .filter(Boolean),
    [userInfos, viewerID],
  );

  const generalThreadInfos = React.useMemo(
    () => generateThreadInfos(generalCommunities),
    [generateThreadInfos, generalCommunities],
  );

  const cryptoThreadInfos = React.useMemo(
    () => generateThreadInfos(cryptoCommunities),
    [generateThreadInfos, cryptoCommunities],
  );

  const generalIndex = useThreadSearchIndex(generalThreadInfos);
  const cryptoIndex = useThreadSearchIndex(cryptoThreadInfos);

  const renderGeneralTab = () => (
    <CommunityList
      threadInfos={generalThreadInfos}
      itemStyle={styles.threadListItem}
      searchIndex={generalIndex}
    />
  );

  const renderCryptoTab = () => (
    <CommunityList
      threadInfos={cryptoThreadInfos}
      itemStyle={styles.threadListItem}
      searchIndex={cryptoIndex}
    />
  );

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'general', title: 'General' },
    { key: 'crypto', title: 'Crypto' },
  ]);

  const renderScene = SceneMap({
    general: renderGeneralTab,
    crypto: renderCryptoTab,
  });

  const colors = useColors();
  const { tabBarBackground, tabBarAccent } = colors;

  const screenOptions = React.useMemo(
    () => ({
      tabBarShowIcon: true,
      tabBarStyle: {
        backgroundColor: tabBarBackground,
      },
      tabBarItemStyle: {
        flexDirection: 'row',
      },
      tabBarIndicatorStyle: {
        borderColor: tabBarAccent,
        borderBottomWidth: 2,
      },
    }),
    [tabBarAccent, tabBarBackground],
  );

  const renderTabBar = (tabBarProps: TabBarProps) => (
    <View style={styles.tabBarContainer}>
      <TabBar
        {...tabBarProps}
        style={screenOptions.tabBarStyle}
        indicatorStyle={screenOptions.tabBarIndicatorStyle}
      />
    </View>
  );

  return (
    <Modal>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Discover communities</Text>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: 400 }}
        renderTabBar={renderTabBar}
      />
    </Modal>
  );
}

const unboundStyles = {
  headerContainer: {
    padding: 10,
    paddingBottom: 0,
  },
  headerText: {
    color: 'modalForegroundLabel',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  threadListItem: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 2,
  },
  tabBarContainer: {
    marginBottom: 15,
  },
};

export default CommunityJoinerModal;
