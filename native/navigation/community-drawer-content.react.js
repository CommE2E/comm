// @flow

import { useDrawerStatus } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { FlatList, Platform, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import {
  fetchPrimaryInviteLinkActionTypes,
  fetchPrimaryInviteLinks,
} from 'lib/actions/link-actions.js';
import {
  childThreadInfos,
  communityThreadSelector,
} from 'lib/selectors/thread-selectors.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import {
  createRecursiveDrawerItemsData,
  appendSuffix,
} from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers.js';

import CommunityDrawerItemCommunity from './community-drawer-item-community.react.js';
import { CommunityCreationRouteName } from './route-names.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';

const maxDepth = 2;
const safeAreaEdges = Platform.select({
  ios: ['top'],
  default: ['top', 'bottom'],
});

function CommunityDrawerContent(): React.Node {
  const communities = useSelector(communityThreadSelector);
  const resolvedCommunities = useResolvedThreadInfos(communities);
  const communitiesSuffixed = React.useMemo(
    () => appendSuffix(resolvedCommunities),
    [resolvedCommunities],
  );
  const styles = useStyles(unboundStyles);

  const callFetchPrimaryLinks = useServerCall(fetchPrimaryInviteLinks);
  const dispatchActionPromise = useDispatchActionPromise();
  const drawerStatus = useDrawerStatus();
  React.useEffect(() => {
    (async () => {
      if (drawerStatus !== 'open') {
        return;
      }
      await dispatchActionPromise(
        fetchPrimaryInviteLinkActionTypes,
        callFetchPrimaryLinks(),
      );
    })();
  }, [callFetchPrimaryLinks, dispatchActionPromise, drawerStatus]);

  const [openCommunity, setOpenCommunity] = React.useState(
    communitiesSuffixed.length === 1 ? communitiesSuffixed[0].id : null,
  );

  const navigateToThread = useNavigateToThread();
  const childThreadInfosMap = useSelector(childThreadInfos);

  const setOpenCommunityOrClose = React.useCallback((index: string) => {
    setOpenCommunity(open => (open === index ? null : index));
  }, []);

  const renderItem = React.useCallback(
    ({ item }) => (
      <CommunityDrawerItemCommunity
        key={item.threadInfo.id}
        itemData={item}
        toggleExpanded={setOpenCommunityOrClose}
        expanded={item.threadInfo.id === openCommunity}
        navigateToThread={navigateToThread}
      />
    ),
    [navigateToThread, openCommunity, setOpenCommunityOrClose],
  );

  const labelStylesObj = useStyles(labelUnboundStyles);
  const labelStyles = React.useMemo(
    () => [
      labelStylesObj.level0Label,
      labelStylesObj.level1Label,
      labelStylesObj.level2Label,
    ],
    [labelStylesObj],
  );

  const drawerItemsData = React.useMemo(
    () =>
      createRecursiveDrawerItemsData(
        childThreadInfosMap,
        communitiesSuffixed,
        labelStyles,
        maxDepth,
      ),
    [childThreadInfosMap, communitiesSuffixed, labelStyles],
  );

  const { navigate } = useNavigation();
  const onPressCommunityCreation = React.useCallback(() => {
    navigate(CommunityCreationRouteName);
  }, [navigate]);

  const communityCreationButton = (
    <TouchableOpacity onPress={onPressCommunityCreation} activeOpacity={0.4}>
      <View style={styles.communityCreationContainer}>
        <View style={styles.communityCreationIconContainer}>
          <SWMansionIcon
            name="plus"
            size={22}
            style={styles.communityCreationIcon}
          />
        </View>
        <Text style={styles.communityCreationText}>Create community</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.drawerContent} edges={safeAreaEdges}>
      <FlatList data={drawerItemsData} renderItem={renderItem} />
      {communityCreationButton}
    </SafeAreaView>
  );
}

const unboundStyles = {
  drawerContent: {
    flex: 1,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  communityCreationContainer: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'panelSeparator',
  },
  communityCreationText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  communityCreationIconContainer: {
    height: 28,
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: 'panelSecondaryForeground',
  },
  communityCreationIcon: {
    color: 'panelForegroundLabel',
  },
};
const labelUnboundStyles = {
  level0Label: {
    color: 'drawerItemLabelLevel0',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  level1Label: {
    color: 'drawerItemLabelLevel1',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  level2Label: {
    color: 'drawerItemLabelLevel2',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
};

const MemoizedCommunityDrawerContent: React.ComponentType<{}> = React.memo(
  CommunityDrawerContent,
);

export default MemoizedCommunityDrawerContent;
