// @flow

import { useDrawerStatus } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { FlatList, Platform, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchAllCommunityInfosWithNamesActionTypes,
  fetchAllCommunityInfosWithNames,
} from 'lib/actions/community-actions.js';
import {
  fetchPrimaryInviteLinkActionTypes,
  useFetchPrimaryInviteLinks,
} from 'lib/actions/link-actions.js';
import { useChildThreadInfosMap } from 'lib/hooks/thread-hooks.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { communityThreadSelector } from 'lib/selectors/thread-selectors.js';
import { viewerIsMember } from 'lib/shared/thread-utils.js';
import type {
  ClientCommunityInfoWithCommunityName,
  ClientFetchAllCommunityInfosWithNamesResponse,
} from 'lib/types/community-types.js';
import { threadTypeIsCommunityRoot } from 'lib/types/thread-types-enum.js';
import {
  createRecursiveDrawerItemsData,
  useAppendCommunitySuffix,
} from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import CommunityDrawerItem from './community-drawer-item.react.js';
import { showCommunityDirectory } from './root-navigator.react.js';
import {
  CommunityCreationRouteName,
  CommunityJoinerModalRouteName,
} from './route-names.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import {
  flattenDrawerItemsData,
  filterOutThreadAndDescendantIDs,
  type CommunityDrawerItemDataFlattened,
} from '../utils/drawer-utils.react.js';

const maxDepth = 2;
const safeAreaEdges: $ReadOnlyArray<string> = Platform.select({
  ios: ['top'],
  default: ['top', 'bottom'],
});

function CommunityDrawerContent(): React.Node {
  const communities = useSelector(communityThreadSelector);
  const resolvedCommunities = useResolvedThreadInfos(communities);
  const communitiesSuffixed = useAppendCommunitySuffix(resolvedCommunities);
  const styles = useStyles(unboundStyles);

  const callFetchPrimaryLinks = useFetchPrimaryInviteLinks();

  const dispatchActionPromise = useDispatchActionPromise();
  const drawerStatus = useDrawerStatus();
  const getAllCommunityInfosWithNames = useLegacyAshoatKeyserverCall(
    fetchAllCommunityInfosWithNames,
  );
  const getAllCommunityInfosWithNamesPromiseRef =
    React.useRef<?Promise<ClientFetchAllCommunityInfosWithNamesResponse>>(null);
  const [fetchedCommunitiesWithNames, setFetchedCommunitiesWithNames] =
    React.useState<?$ReadOnlyArray<ClientCommunityInfoWithCommunityName>>(null);
  React.useEffect(() => {
    if (drawerStatus !== 'open') {
      return;
    }
    void dispatchActionPromise(
      fetchPrimaryInviteLinkActionTypes,
      callFetchPrimaryLinks(),
    );
    const getAllCommunityInfosWithNamesPromise =
      getAllCommunityInfosWithNames();
    getAllCommunityInfosWithNamesPromiseRef.current =
      getAllCommunityInfosWithNamesPromise;
    void dispatchActionPromise(
      fetchAllCommunityInfosWithNamesActionTypes,
      getAllCommunityInfosWithNamesPromise,
    );
    void (async () => {
      const response = await getAllCommunityInfosWithNamesPromise;
      setFetchedCommunitiesWithNames(
        response.allCommunityInfosWithNames.filter(
          community => !viewerIsMember(community.threadInfo),
        ),
      );
    })();
  }, [
    callFetchPrimaryLinks,
    dispatchActionPromise,
    drawerStatus,
    getAllCommunityInfosWithNames,
  ]);

  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
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
  const childThreadInfosMap = useChildThreadInfosMap();

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
    (id: string) =>
      setExpanded(expandedState => {
        if (expanded.has(id)) {
          return new Set(
            filterOutThreadAndDescendantIDs(
              [...expandedState.values()],
              drawerItemsData,
              id,
            ),
          );
        }
        return new Set([...expanded.values(), id]);
      }),
    [drawerItemsData, expanded],
  );

  const navigateToThread = useNavigateToThread();

  const renderItem = React.useCallback(
    ({
      item,
    }: {
      +item: CommunityDrawerItemDataFlattened,
      ...
    }): React.Node => {
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

  const onPressExploreCommunities = React.useCallback(async () => {
    if (fetchedCommunitiesWithNames) {
      navigate<'CommunityJoinerModal'>({
        name: CommunityJoinerModalRouteName,
        params: { communities: fetchedCommunitiesWithNames },
      });
      return;
    }
    if (getAllCommunityInfosWithNamesPromiseRef.current) {
      try {
        const response = await getAllCommunityInfosWithNamesPromiseRef.current;
        navigate<'CommunityJoinerModal'>({
          name: CommunityJoinerModalRouteName,
          params: { communities: response.allCommunityInfosWithNames },
        });
        return;
      } catch (error) {
        // Handle error silently; fallback to showing the alert below
      }
    }
    Alert.alert(
      'Couldn’t load communities',
      'Uhh... try again?',
      [{ text: 'OK' }],
      {
        cancelable: true,
      },
    );
  }, [fetchedCommunitiesWithNames, navigate]);

  let exploreCommunitiesButton;
  if (showCommunityDirectory) {
    exploreCommunitiesButton = (
      <TouchableOpacity onPress={onPressExploreCommunities} activeOpacity={0.4}>
        <View style={styles.exploreCommunitiesContainer}>
          <View style={styles.exploreCommunitiesIconContainer}>
            <SWMansionIcon
              name="search"
              size={22}
              style={styles.exploreCommunitiesIcon}
            />
          </View>
          <Text style={styles.exploreCommunitiesText}>Explore communities</Text>
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
      {exploreCommunitiesButton}
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
    padding: 16,
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
  exploreCommunitiesContainer: {
    flexDirection: 'row',
    paddingTop: 0,
    padding: 16,
    alignItems: 'center',
  },
  exploreCommunitiesText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  exploreCommunitiesIconContainer: {
    height: 28,
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: 'panelSecondaryForeground',
  },
  exploreCommunitiesIcon: {
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
