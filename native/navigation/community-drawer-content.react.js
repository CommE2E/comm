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
import { threadTypeIsCommunityRoot } from 'lib/types/thread-types-enum.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import {
  createRecursiveDrawerItemsData,
  appendSuffix,
} from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers.js';

import CommunityDrawerItem from './community-drawer-item.react.js';
import { CommunityCreationRouteName } from './route-names.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';
import {
  flattenDrawerItemsData,
  filterThreadAndDescendantIDs,
} from '../utils/drawer-utils.react.js';

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

  const [expanded, setExpanded] = React.useState(() => {
    if (communitiesSuffixed.length === 1) {
      return new Set([communitiesSuffixed[0].id]);
    }
    return new Set();
  });

  const setOpenCommunityOrClose = React.useCallback(
    (id: string) =>
      expanded.has(id) ? setExpanded(new Set()) : setExpanded(new Set([id])),
    [expanded],
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
  const childThreadInfosMap = useSelector(childThreadInfos);

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

  const toggleExpanded = React.useCallback(
    (id: string) => {
      if (expanded.has(id)) {
        setExpanded(
          expandedState =>
            new Set(
              filterThreadAndDescendantIDs(
                [...expandedState.values()],
                drawerItemsData,
                id,
              ),
            ),
        );
        return;
      }
      setExpanded(new Set([...expanded.values(), id]));
    },
    [drawerItemsData, expanded],
  );

  const navigateToThread = useNavigateToThread();

  const renderItem = React.useCallback(
    ({ item }) => {
      const isCommunity = threadTypeIsCommunityRoot(item.threadInfo.type);
      return (
        <CommunityDrawerItem
          key={item.threadInfo.id}
          itemData={item}
          navigateToThread={navigateToThread}
          isExpanded={expanded.has(item.threadInfo.id)}
          toggleExpanded={
            isCommunity ? setOpenCommunityOrClose : toggleExpanded
          }
        />
      );
    },
    [expanded, navigateToThread, setOpenCommunityOrClose, toggleExpanded],
  );

  const { navigate } = useNavigation();
  const onPressCommunityCreation = React.useCallback(() => {
    navigate(CommunityCreationRouteName);
  }, [navigate]);

  const isCommunityCreationButtonEnabled = false;
  let communityCreationButton;
  if (isCommunityCreationButtonEnabled) {
    communityCreationButton = (
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
  }

  const flattenedDrawerItemsData = React.useMemo(
    () => flattenDrawerItemsData(drawerItemsData, [...expanded.values()]),
    [drawerItemsData, expanded],
  );

  return (
    <SafeAreaView style={styles.drawerContent} edges={safeAreaEdges}>
      <FlatList
        data={flattenedDrawerItemsData}
        renderItem={renderItem}
        initialNumToRender={30}
      />
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
