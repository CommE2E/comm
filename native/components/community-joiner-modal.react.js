// @flow

import * as React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import {
  TabView,
  SceneMap,
  TabBar,
  type TabBarProps,
} from 'react-native-tab-view';

import { cryptoCommunityIDs } from 'lib/facts/communities.js';
import { useThreadSearchIndex } from 'lib/selectors/nav-selectors.js';
import { threadInfoFromRawThreadInfo } from 'lib/shared/thread-utils.js';
import type { ClientCommunityInfoWithCommunityName } from 'lib/types/community-types.js';

import Modal from './modal.react.js';
import CommunityList from '../components/community-list.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import {
  modalBorderWidth,
  modalMarginHorizontal,
  modalPadding,
} from '../utils/modal-consts.js';

export type CommunityJoinerModalParams = {
  +communities: $ReadOnlyArray<ClientCommunityInfoWithCommunityName>,
};

type Props = {
  +navigation: RootNavigationProp<'CommunityJoinerModal'>,
  +route: NavigationRoute<'CommunityJoinerModal'>,
};

const routes = [
  { key: 'general', title: 'General' },
  { key: 'crypto', title: 'Crypto' },
];

function CommunityJoinerModal(props: Props): React.Node {
  const { params } = props.route;
  const { communities } = params;

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const userInfos = useSelector(state => state.userStore.userInfos);
  const styles = useStyles(unboundStyles);

  const generalCommunities = React.useMemo(
    () =>
      communities.filter(
        community => !cryptoCommunityIDs.includes(community.id),
      ),
    [communities],
  );
  const cryptoCommunities = React.useMemo(
    () =>
      communities.filter(community =>
        cryptoCommunityIDs.includes(community.id),
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

  const renderGeneralTab = React.useCallback(
    () => (
      <CommunityList
        threadInfos={generalThreadInfos}
        itemStyle={styles.threadListItem}
        searchIndex={generalIndex}
      />
    ),
    [generalIndex, generalThreadInfos, styles.threadListItem],
  );

  const renderCryptoTab = React.useCallback(
    () => (
      <CommunityList
        threadInfos={cryptoThreadInfos}
        itemStyle={styles.threadListItem}
        searchIndex={cryptoIndex}
      />
    ),
    [cryptoIndex, cryptoThreadInfos, styles.threadListItem],
  );

  const [index, setIndex] = React.useState(0);

  const navigationState = React.useMemo(() => ({ index, routes }), [index]);

  const renderScene = React.useMemo(
    () =>
      SceneMap({
        general: renderGeneralTab,
        crypto: renderCryptoTab,
      }),
    [renderCryptoTab, renderGeneralTab],
  );

  const colors = useColors();
  const {
    modalBackground,
    tabBarAccent,
    modalForegroundLabel,
    modalForegroundSecondaryLabel,
  } = colors;

  const tabProps = React.useMemo(
    () => ({
      style: {
        backgroundColor: modalBackground,
      },
      indicatorStyle: {
        borderColor: tabBarAccent,
        borderBottomWidth: 2,
      },
      activeColor: modalForegroundLabel,
      inactiveColor: modalForegroundSecondaryLabel,
    }),
    [
      modalForegroundLabel,
      modalForegroundSecondaryLabel,
      tabBarAccent,
      modalBackground,
    ],
  );

  const windowDimensions = useWindowDimensions();
  const initialLayout = React.useMemo(
    () => ({
      width:
        windowDimensions.width -
        2 * (modalBorderWidth + modalMarginHorizontal + modalPadding),
    }),
    [windowDimensions.width],
  );

  const renderTabBar = React.useCallback(
    (tabBarProps: TabBarProps) => (
      <View style={styles.tabBarContainer}>
        <TabBar {...tabBarProps} {...tabProps} />
      </View>
    ),
    [tabProps, styles.tabBarContainer],
  );

  return (
    <Modal>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Discover communities</Text>
      </View>
      <TabView
        navigationState={navigationState}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
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
