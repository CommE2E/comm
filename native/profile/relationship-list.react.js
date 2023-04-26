// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import {
  updateRelationshipsActionTypes,
  updateRelationships,
} from 'lib/actions/relationship-actions.js';
import {
  searchUsersActionTypes,
  searchUsers,
} from 'lib/actions/user-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { registerFetchKey } from 'lib/reducers/loading-reducer.js';
import { userRelationshipsSelector } from 'lib/selectors/relationship-selectors.js';
import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors.js';
import {
  userRelationshipStatus,
  relationshipActions,
} from 'lib/types/relationship-types.js';
import type {
  GlobalAccountUserInfo,
  AccountUserInfo,
} from 'lib/types/user-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import RelationshipListItem from './relationship-list-item.react.js';
import LinkButton from '../components/link-button.react.js';
import { createTagInput, BaseTagInput } from '../components/tag-input.react.js';
import { KeyboardContext } from '../keyboard/keyboard-state.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  FriendListRouteName,
  BlockListRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useIndicatorStyle } from '../themes/colors.js';
import type { VerticalBounds } from '../types/layout-types.js';

const TagInput = createTagInput<GlobalAccountUserInfo>();

export type RelationshipListNavigate = $PropertyType<
  ProfileNavigationProp<'FriendList' | 'BlockList'>,
  'navigate',
>;

const tagInputProps = {
  placeholder: 'username',
  autoFocus: true,
  returnKeyType: 'go',
};

type ListItem =
  | { +type: 'empty', +because: 'no-relationships' | 'no-results' }
  | { +type: 'header' }
  | { +type: 'footer' }
  | {
      +type: 'user',
      +userInfo: AccountUserInfo,
      +lastListItem: boolean,
      +verticalBounds: ?VerticalBounds,
    };

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function keyExtractor(item: ListItem) {
  if (item.userInfo) {
    return item.userInfo.id;
  } else if (item.type === 'empty') {
    return 'empty';
  } else if (item.type === 'header') {
    return 'header';
  } else if (item.type === 'footer') {
    return 'footer';
  }
  invariant(false, 'keyExtractor conditions should be exhaustive');
}

const tagDataLabelExtractor = (userInfo: GlobalAccountUserInfo) =>
  userInfo.username;

type Props = {
  +navigation: ProfileNavigationProp<>,
  +route: NavigationRoute<'FriendList' | 'BlockList'>,
};
function RelationshipList(props: Props): React.Node {
  const callSearchUsers = useServerCall(searchUsers);
  const userInfos = useSelector(state => state.userStore.userInfos);
  const searchUsersOnServer = React.useCallback(
    async (usernamePrefix: string) => {
      if (usernamePrefix.length === 0) {
        return [];
      }

      const userInfosResult = await callSearchUsers(usernamePrefix);
      return userInfosResult.userInfos;
    },
    [callSearchUsers],
  );

  const [searchInputText, setSearchInputText] = React.useState<string>('');
  const [userStoreSearchResults, setUserStoreSearchResults] = React.useState<
    $ReadOnlySet<string>,
  >(new Set());
  const [serverSearchResults, setServerSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);

  const { route } = props;
  const routeName = route.name;
  const userStoreSearchIndex = useSelector(userStoreSearchIndexSelector);
  const onChangeSearchText = React.useCallback(
    async (searchText: string) => {
      setSearchInputText(searchText);

      const excludeStatuses = {
        [FriendListRouteName]: [
          userRelationshipStatus.BLOCKED_VIEWER,
          userRelationshipStatus.BOTH_BLOCKED,
        ],
        [BlockListRouteName]: [],
      }[routeName];
      const results = userStoreSearchIndex
        .getSearchResults(searchText)
        .filter(userID => {
          const relationship = userInfos[userID].relationshipStatus;
          return !excludeStatuses.includes(relationship);
        });
      setUserStoreSearchResults(new Set(results));

      const searchResultsFromServer = await searchUsersOnServer(searchText);
      const filteredServerSearchResults = searchResultsFromServer.filter(
        searchUserInfo => {
          const userInfo = userInfos[searchUserInfo.id];
          return (
            !userInfo || !excludeStatuses.includes(userInfo.relationshipStatus)
          );
        },
      );
      setServerSearchResults(filteredServerSearchResults);
    },
    [routeName, userStoreSearchIndex, userInfos, searchUsersOnServer],
  );

  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'RelationshipList should have OverlayContext');
  const scrollEnabled = overlayContext.scrollBlockingModalStatus === 'closed';

  const tagInputRef = React.useRef<?BaseTagInput<GlobalAccountUserInfo>>();
  const flatListContainerRef = React.useRef<?React.ElementRef<typeof View>>();

  const keyboardState = React.useContext(KeyboardContext);
  const keyboardNotShowing = !!(
    keyboardState && !keyboardState.keyboardShowing
  );
  const [verticalBounds, setVerticalBounds] =
    React.useState<?VerticalBounds>(null);
  const onFlatListContainerLayout = React.useCallback(() => {
    if (!flatListContainerRef.current) {
      return;
    }

    if (!keyboardNotShowing) {
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
  }, [keyboardNotShowing]);

  const [currentTags, setCurrentTags] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);

  const onSelect = React.useCallback(
    (selectedUser: GlobalAccountUserInfo) => {
      if (currentTags.find(o => o.id === selectedUser.id)) {
        return;
      }
      setSearchInputText('');
      setCurrentTags(prevCurrentTags => prevCurrentTags.concat(selectedUser));
    },
    [currentTags],
  );

  const onUnknownErrorAlertAcknowledged = React.useCallback(() => {
    setCurrentTags([]);
    setSearchInputText('');
    invariant(tagInputRef.current, 'tagInput should be set');
    tagInputRef.current.focus();
  }, []);

  const callUpdateRelationships = useServerCall(updateRelationships);
  const updateRelationshipsOnServer = React.useCallback(async () => {
    const action = {
      [FriendListRouteName]: relationshipActions.FRIEND,
      [BlockListRouteName]: relationshipActions.BLOCK,
    }[routeName];
    const userIDs = currentTags.map(userInfo => userInfo.id);
    try {
      const result = await callUpdateRelationships({
        action,
        userIDs,
      });
      setCurrentTags([]);
      setSearchInputText('');
      return result;
    } catch (e) {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: onUnknownErrorAlertAcknowledged }],
        { cancelable: true, onDismiss: onUnknownErrorAlertAcknowledged },
      );
      throw e;
    }
  }, [
    routeName,
    currentTags,
    callUpdateRelationships,
    onUnknownErrorAlertAcknowledged,
  ]);

  const dispatchActionPromise = useDispatchActionPromise();
  const noCurrentTags = currentTags.length === 0;
  const onPressAdd = React.useCallback(() => {
    if (noCurrentTags) {
      return;
    }
    dispatchActionPromise(
      updateRelationshipsActionTypes,
      updateRelationshipsOnServer(),
    );
  }, [noCurrentTags, dispatchActionPromise, updateRelationshipsOnServer]);
  const inputProps = React.useMemo(
    () => ({
      ...tagInputProps,
      onSubmitEditing: onPressAdd,
    }),
    [onPressAdd],
  );

  const { navigation } = props;
  const { navigate } = navigation;
  const styles = useStyles(unboundStyles);
  const renderItem = React.useCallback(
    // ESLint doesn't recognize that invariant always throws
    // eslint-disable-next-line consistent-return
    ({ item }: { item: ListItem, ... }) => {
      if (item.type === 'empty') {
        const action = {
          [FriendListRouteName]: 'added',
          [BlockListRouteName]: 'blocked',
        }[routeName];

        const emptyMessage =
          item.because === 'no-relationships'
            ? `You haven't ${action} any users yet`
            : 'No results';

        return <Text style={styles.emptyText}>{emptyMessage}</Text>;
      } else if (item.type === 'header' || item.type === 'footer') {
        return <View style={styles.separator} />;
      } else if (item.type === 'user') {
        return (
          <RelationshipListItem
            userInfo={item.userInfo}
            lastListItem={item.lastListItem}
            verticalBounds={item.verticalBounds}
            navigate={navigate}
            relationshipListRoute={route}
            onSelect={onSelect}
          />
        );
      } else {
        invariant(false, `unexpected RelationshipList item type ${item.type}`);
      }
    },
    [routeName, navigate, route, onSelect, styles.emptyText, styles.separator],
  );

  const { setOptions } = navigation;
  const prevNoCurrentTags = React.useRef(noCurrentTags);
  React.useEffect(() => {
    let setSaveButtonDisabled;
    if (!prevNoCurrentTags.current && noCurrentTags) {
      setSaveButtonDisabled = true;
    } else if (prevNoCurrentTags.current && !noCurrentTags) {
      setSaveButtonDisabled = false;
    }
    prevNoCurrentTags.current = noCurrentTags;
    if (setSaveButtonDisabled === undefined) {
      return;
    }
    setOptions({
      // eslint-disable-next-line react/display-name
      headerRight: () => (
        <LinkButton
          text="Save"
          onPress={onPressAdd}
          disabled={setSaveButtonDisabled}
        />
      ),
    });
  }, [setOptions, noCurrentTags, onPressAdd]);

  const relationships = useSelector(userRelationshipsSelector);
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const usersWithoutENSNames = React.useMemo(() => {
    if (searchInputText === '') {
      return {
        [FriendListRouteName]: relationships.friends,
        [BlockListRouteName]: relationships.blocked,
      }[routeName];
    }

    const mergedUserInfos: { [id: string]: AccountUserInfo } = {};
    for (const userInfo of serverSearchResults) {
      mergedUserInfos[userInfo.id] = userInfo;
    }
    for (const id of userStoreSearchResults) {
      const { username, relationshipStatus } = userInfos[id];
      if (username) {
        mergedUserInfos[id] = { id, username, relationshipStatus };
      }
    }

    const excludeUserIDsArray = currentTags
      .map(userInfo => userInfo.id)
      .concat(viewerID || []);
    const excludeUserIDs = new Set(excludeUserIDsArray);

    const sortToEnd = [];
    const userSearchResults = [];
    const sortRelationshipTypesToEnd = {
      [FriendListRouteName]: [userRelationshipStatus.FRIEND],
      [BlockListRouteName]: [
        userRelationshipStatus.BLOCKED_BY_VIEWER,
        userRelationshipStatus.BOTH_BLOCKED,
      ],
    }[routeName];
    for (const userID in mergedUserInfos) {
      if (excludeUserIDs.has(userID)) {
        continue;
      }

      const userInfo = mergedUserInfos[userID];
      if (sortRelationshipTypesToEnd.includes(userInfo.relationshipStatus)) {
        sortToEnd.push(userInfo);
      } else {
        userSearchResults.push(userInfo);
      }
    }

    return userSearchResults.concat(sortToEnd);
  }, [
    searchInputText,
    relationships,
    routeName,
    viewerID,
    currentTags,
    serverSearchResults,
    userStoreSearchResults,
    userInfos,
  ]);

  const displayUsers = useENSNames(usersWithoutENSNames);
  const listData = React.useMemo(() => {
    let emptyItem;
    if (displayUsers.length === 0 && searchInputText === '') {
      emptyItem = { type: 'empty', because: 'no-relationships' };
    } else if (displayUsers.length === 0) {
      emptyItem = { type: 'empty', because: 'no-results' };
    }

    const mappedUsers = displayUsers.map((userInfo, index) => ({
      type: 'user',
      userInfo,
      lastListItem: displayUsers.length - 1 === index,
      verticalBounds,
    }));

    return []
      .concat(emptyItem ? emptyItem : [])
      .concat(emptyItem ? [] : { type: 'header' })
      .concat(mappedUsers)
      .concat(emptyItem ? [] : { type: 'footer' });
  }, [displayUsers, verticalBounds, searchInputText]);

  const indicatorStyle = useIndicatorStyle();
  const currentTagsWithENSNames = useENSNames(currentTags);
  return (
    <View style={styles.container}>
      <View style={styles.tagInputContainer}>
        <Text style={styles.tagInputLabel}>Search:</Text>
        <View style={styles.tagInput}>
          <TagInput
            value={currentTagsWithENSNames}
            onChange={setCurrentTags}
            text={searchInputText}
            onChangeText={onChangeSearchText}
            labelExtractor={tagDataLabelExtractor}
            ref={tagInputRef}
            inputProps={inputProps}
            maxHeight={36}
          />
        </View>
      </View>
      <View
        ref={flatListContainerRef}
        onLayout={onFlatListContainerLayout}
        style={styles.container}
      >
        <FlatList
          contentContainerStyle={styles.contentContainer}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          scrollEnabled={scrollEnabled}
          indicatorStyle={indicatorStyle}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: Platform.OS === 'android' ? 1.5 : 1,
  },
  emptyText: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
  tagInput: {
    flex: 1,
    marginLeft: 8,
    paddingRight: 12,
  },
  tagInputLabel: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    paddingLeft: 12,
  },
  tagInputContainer: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    flexDirection: 'row',
    paddingVertical: 6,
  },
};

registerFetchKey(searchUsersActionTypes);
registerFetchKey(updateRelationshipsActionTypes);

const MemoizedRelationshipList: React.ComponentType<Props> =
  React.memo<Props>(RelationshipList);
MemoizedRelationshipList.displayName = 'RelationshipList';

export default MemoizedRelationshipList;
