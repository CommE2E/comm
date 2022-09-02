// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, FlatList, Alert, Platform } from 'react-native';
import { createSelector } from 'reselect';

import {
  updateRelationshipsActionTypes,
  updateRelationships,
} from 'lib/actions/relationship-actions';
import { searchUsersActionTypes, searchUsers } from 'lib/actions/user-actions';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { userRelationshipsSelector } from 'lib/selectors/relationship-selectors';
import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import {
  type UserRelationships,
  type RelationshipRequest,
  type RelationshipErrors,
  userRelationshipStatus,
  relationshipActions,
} from 'lib/types/relationship-types';
import type { UserSearchResult } from 'lib/types/search-types';
import type {
  UserInfos,
  GlobalAccountUserInfo,
  AccountUserInfo,
} from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import LinkButton from '../components/link-button.react';
import { createTagInput, BaseTagInput } from '../components/tag-input.react';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import type { NavigationRoute } from '../navigation/route-names';
import {
  FriendListRouteName,
  BlockListRouteName,
} from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import {
  useStyles,
  type IndicatorStyle,
  useIndicatorStyle,
} from '../themes/colors';
import type { VerticalBounds } from '../types/layout-types';
import type { ProfileNavigationProp } from './profile.react';
import RelationshipListItem from './relationship-list-item.react';

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

type BaseProps = {
  +navigation: ProfileNavigationProp<>,
  +route: NavigationRoute<'FriendList' | 'BlockList'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +relationships: UserRelationships,
  +userInfos: UserInfos,
  +viewerID: ?string,
  +userStoreSearchIndex: SearchIndex,
  +styles: typeof unboundStyles,
  +indicatorStyle: IndicatorStyle,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +searchUsers: (usernamePrefix: string) => Promise<UserSearchResult>,
  +updateRelationships: (
    request: RelationshipRequest,
  ) => Promise<RelationshipErrors>,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
};
type State = {
  +verticalBounds: ?VerticalBounds,
  +searchInputText: string,
  +serverSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
  +currentTags: $ReadOnlyArray<GlobalAccountUserInfo>,
  +userStoreSearchResults: Set<string>,
};
type PropsAndState = { ...Props, ...State };
class RelationshipList extends React.PureComponent<Props, State> {
  flatListContainerRef = React.createRef();
  tagInput: ?BaseTagInput<GlobalAccountUserInfo> = null;
  state: State = {
    verticalBounds: null,
    searchInputText: '',
    serverSearchResults: [],
    userStoreSearchResults: new Set(),
    currentTags: [],
  };

  componentDidMount() {
    this.setSaveButton(false);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const prevTags = prevState.currentTags.length;
    const currentTags = this.state.currentTags.length;
    if (prevTags !== 0 && currentTags === 0) {
      this.setSaveButton(false);
    } else if (prevTags === 0 && currentTags !== 0) {
      this.setSaveButton(true);
    }
  }

  setSaveButton(enabled: boolean) {
    this.props.navigation.setOptions({
      headerRight: () => (
        <LinkButton text="Save" onPress={this.onPressAdd} disabled={!enabled} />
      ),
    });
  }

  static keyExtractor = (item: ListItem) => {
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
  };

  get listData() {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  static getOverlayContext(props: Props) {
    const { overlayContext } = props;
    invariant(overlayContext, 'RelationshipList should have OverlayContext');
    return overlayContext;
  }

  static scrollDisabled(props: Props) {
    const overlayContext = RelationshipList.getOverlayContext(props);
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  render() {
    const inputProps = {
      ...tagInputProps,
      onSubmitEditing: this.onPressAdd,
    };
    return (
      <View style={this.props.styles.container}>
        <View style={this.props.styles.tagInputContainer}>
          <Text style={this.props.styles.tagInputLabel}>Search:</Text>
          <View style={this.props.styles.tagInput}>
            <TagInput
              value={this.state.currentTags}
              onChange={this.onChangeTagInput}
              text={this.state.searchInputText}
              onChangeText={this.onChangeSearchText}
              labelExtractor={this.tagDataLabelExtractor}
              ref={this.tagInputRef}
              inputProps={inputProps}
              maxHeight={36}
            />
          </View>
        </View>
        <View
          ref={this.flatListContainerRef}
          onLayout={this.onFlatListContainerLayout}
          style={this.props.styles.container}
        >
          <FlatList
            contentContainerStyle={this.props.styles.contentContainer}
            data={this.listData}
            renderItem={this.renderItem}
            keyExtractor={RelationshipList.keyExtractor}
            scrollEnabled={!RelationshipList.scrollDisabled(this.props)}
            indicatorStyle={this.props.indicatorStyle}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    );
  }

  listDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.relationships,
    (propsAndState: PropsAndState) => propsAndState.route.name,
    (propsAndState: PropsAndState) => propsAndState.verticalBounds,
    (propsAndState: PropsAndState) => propsAndState.searchInputText,
    (propsAndState: PropsAndState) => propsAndState.serverSearchResults,
    (propsAndState: PropsAndState) => propsAndState.userStoreSearchResults,
    (propsAndState: PropsAndState) => propsAndState.userInfos,
    (propsAndState: PropsAndState) => propsAndState.viewerID,
    (propsAndState: PropsAndState) => propsAndState.currentTags,
    (
      relationships: UserRelationships,
      routeName: 'FriendList' | 'BlockList',
      verticalBounds: ?VerticalBounds,
      searchInputText: string,
      serverSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
      userStoreSearchResults: Set<string>,
      userInfos: UserInfos,
      viewerID: ?string,
      currentTags: $ReadOnlyArray<GlobalAccountUserInfo>,
    ) => {
      const defaultUsers = {
        [FriendListRouteName]: relationships.friends,
        [BlockListRouteName]: relationships.blocked,
      }[routeName];

      const excludeUserIDsArray = currentTags
        .map(userInfo => userInfo.id)
        .concat(viewerID || []);

      const excludeUserIDs = new Set(excludeUserIDsArray);

      let displayUsers = defaultUsers;

      if (searchInputText !== '') {
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
          if (
            sortRelationshipTypesToEnd.includes(userInfo.relationshipStatus)
          ) {
            sortToEnd.push(userInfo);
          } else {
            userSearchResults.push(userInfo);
          }
        }

        displayUsers = userSearchResults.concat(sortToEnd);
      }

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
    },
  );

  tagInputRef = (tagInput: ?BaseTagInput<GlobalAccountUserInfo>) => {
    this.tagInput = tagInput;
  };

  tagDataLabelExtractor = (userInfo: GlobalAccountUserInfo) =>
    userInfo.username;

  onChangeTagInput = (currentTags: $ReadOnlyArray<GlobalAccountUserInfo>) => {
    this.setState({ currentTags });
  };

  onChangeSearchText = async (searchText: string) => {
    const excludeStatuses = {
      [FriendListRouteName]: [
        userRelationshipStatus.BLOCKED_VIEWER,
        userRelationshipStatus.BOTH_BLOCKED,
      ],
      [BlockListRouteName]: [],
    }[this.props.route.name];

    const results = this.props.userStoreSearchIndex
      .getSearchResults(searchText)
      .filter(userID => {
        const relationship = this.props.userInfos[userID].relationshipStatus;
        return !excludeStatuses.includes(relationship);
      });

    this.setState({
      searchInputText: searchText,
      userStoreSearchResults: new Set(results),
    });

    const serverSearchResults = await this.searchUsers(searchText);
    const filteredServerSearchResults = serverSearchResults.filter(
      searchUserInfo => {
        const userInfo = this.props.userInfos[searchUserInfo.id];
        return (
          !userInfo || !excludeStatuses.includes(userInfo.relationshipStatus)
        );
      },
    );
    this.setState({ serverSearchResults: filteredServerSearchResults });
  };

  async searchUsers(usernamePrefix: string) {
    if (usernamePrefix.length === 0) {
      return [];
    }

    const { userInfos } = await this.props.searchUsers(usernamePrefix);
    return userInfos;
  }

  onFlatListContainerLayout = () => {
    const { flatListContainerRef } = this;
    if (!flatListContainerRef.current) {
      return;
    }

    const { keyboardState } = this.props;
    if (!keyboardState || keyboardState.keyboardShowing) {
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
        this.setState({ verticalBounds: { height, y: pageY } });
      },
    );
  };

  onSelect = (selectedUser: GlobalAccountUserInfo) => {
    this.setState(state => {
      if (state.currentTags.find(o => o.id === selectedUser.id)) {
        return null;
      }
      return {
        searchInputText: '',
        currentTags: state.currentTags.concat(selectedUser),
      };
    });
  };

  onPressAdd = () => {
    if (this.state.currentTags.length === 0) {
      return;
    }
    this.props.dispatchActionPromise(
      updateRelationshipsActionTypes,
      this.updateRelationships(),
    );
  };

  async updateRelationships() {
    const routeName = this.props.route.name;
    const action = {
      [FriendListRouteName]: relationshipActions.FRIEND,
      [BlockListRouteName]: relationshipActions.BLOCK,
    }[routeName];
    const userIDs = this.state.currentTags.map(userInfo => userInfo.id);

    try {
      const result = await this.props.updateRelationships({
        action,
        userIDs,
      });
      this.setState({
        currentTags: [],
        searchInputText: '',
      });
      return result;
    } catch (e) {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
        { cancelable: true, onDismiss: this.onUnknownErrorAlertAcknowledged },
      );
      throw e;
    }
  }

  onErrorAcknowledged = () => {
    invariant(this.tagInput, 'tagInput should be set');
    this.tagInput.focus();
  };

  onUnknownErrorAlertAcknowledged = () => {
    this.setState(
      {
        currentTags: [],
        searchInputText: '',
      },
      this.onErrorAcknowledged,
    );
  };

  renderItem = ({ item }: { item: ListItem, ... }) => {
    if (item.type === 'empty') {
      const action = {
        [FriendListRouteName]: 'added',
        [BlockListRouteName]: 'blocked',
      }[this.props.route.name];

      const emptyMessage =
        item.because === 'no-relationships'
          ? `You haven’t ${action} any users yet`
          : 'No results';

      return <Text style={this.props.styles.emptyText}>{emptyMessage}</Text>;
    } else if (item.type === 'header' || item.type === 'footer') {
      return <View style={this.props.styles.separator} />;
    } else if (item.type === 'user') {
      return (
        <RelationshipListItem
          userInfo={item.userInfo}
          lastListItem={item.lastListItem}
          verticalBounds={item.verticalBounds}
          navigate={this.props.navigation.navigate}
          relationshipListRoute={this.props.route}
          onSelect={this.onSelect}
        />
      );
    } else {
      invariant(false, `unexpected RelationshipList item type ${item.type}`);
    }
  };
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

const ConnectedRelationshipList: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedRelationshipList(props: BaseProps) {
    const relationships = useSelector(userRelationshipsSelector);
    const userInfos = useSelector(state => state.userStore.userInfos);
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const userStoreSearchIndex = useSelector(userStoreSearchIndexSelector);
    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();
    const overlayContext = React.useContext(OverlayContext);
    const keyboardState = React.useContext(KeyboardContext);

    const dispatchActionPromise = useDispatchActionPromise();
    const callSearchUsers = useServerCall(searchUsers);
    const callUpdateRelationships = useServerCall(updateRelationships);

    return (
      <RelationshipList
        {...props}
        relationships={relationships}
        userInfos={userInfos}
        viewerID={viewerID}
        userStoreSearchIndex={userStoreSearchIndex}
        styles={styles}
        indicatorStyle={indicatorStyle}
        overlayContext={overlayContext}
        keyboardState={keyboardState}
        dispatchActionPromise={dispatchActionPromise}
        searchUsers={callSearchUsers}
        updateRelationships={callUpdateRelationships}
      />
    );
  },
);

export default ConnectedRelationshipList;
