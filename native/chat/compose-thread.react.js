// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  type ThreadType,
  threadTypes,
  threadTypePropType,
  type NewThreadRequest,
  type NewThreadResult,
} from 'lib/types/thread-types';
import {
  type AccountUserInfo,
  accountUserInfoPropType,
} from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { UserSearchResult } from 'lib/types/search-types';
import type { Styles } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Text, Alert } from 'react-native';
import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _sortBy from 'lodash/fp/sortBy';
import { createSelector } from 'reselect';

import { connect } from 'lib/utils/redux-utils';
import { newThreadActionTypes, newThread } from 'lib/actions/thread-actions';
import { searchUsersActionTypes, searchUsers } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import { threadInChatList, userIsMember } from 'lib/shared/thread-utils';
import { getUserSearchResults } from 'lib/shared/search-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import TagInput from '../components/tag-input.react';
import UserList from '../components/user-list.react';
import ThreadList from '../components/thread-list.react';
import LinkButton from '../components/link-button.react';
import { MessageListRouteName } from '../navigation/route-names';
import ThreadVisibility from '../components/thread-visibility.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';

const tagInputProps = {
  placeholder: 'username',
  autoFocus: true,
  returnKeyType: 'go',
};

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    threadType?: ThreadType,
    parentThreadInfo?: ThreadInfo,
    createButtonDisabled?: boolean,
  |},
|}>;

let queuedPress = false;
function setQueuedPress() {
  queuedPress = true;
}
let onPressCreateThread = setQueuedPress;
function setOnPressCreateThread(func: ?() => void) {
  if (!func) {
    onPressCreateThread = setQueuedPress;
    return;
  }
  onPressCreateThread = func;
  if (queuedPress) {
    onPressCreateThread();
    queuedPress = false;
  }
}
function pressCreateThread() {
  onPressCreateThread();
}

type Props = {|
  navigation: NavProp,
  // Redux state
  parentThreadInfo: ?ThreadInfo,
  loadingStatus: LoadingStatus,
  otherUserInfos: { [id: string]: AccountUserInfo },
  userSearchIndex: SearchIndex,
  threadInfos: { [id: string]: ThreadInfo },
  colors: Colors,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  newThread: (request: NewThreadRequest) => Promise<NewThreadResult>,
  searchUsers: (usernamePrefix: string) => Promise<UserSearchResult>,
|};
type State = {|
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
type PropsAndState = {| ...Props, ...State |};
class ComposeThread extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
        params: PropTypes.shape({
          threadType: threadTypePropType,
          parentThreadInfo: threadInfoPropType,
          createButtonDisabled: PropTypes.bool,
        }).isRequired,
      }).isRequired,
      setParams: PropTypes.func.isRequired,
      goBack: PropTypes.func.isRequired,
      navigate: PropTypes.func.isRequired,
      getParam: PropTypes.func.isRequired,
    }).isRequired,
    parentThreadInfo: threadInfoPropType,
    loadingStatus: loadingStatusPropType.isRequired,
    otherUserInfos: PropTypes.objectOf(accountUserInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    threadInfos: PropTypes.objectOf(threadInfoPropType).isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    newThread: PropTypes.func.isRequired,
    searchUsers: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: 'Compose thread',
    headerRight: (
      <LinkButton
        text="Create"
        onPress={pressCreateThread}
        disabled={!!navigation.getParam('createButtonDisabled')}
      />
    ),
    headerBackTitle: 'Back',
  });
  state = {
    usernameInputText: '',
    userInfoInputArray: [],
  };
  tagInput: ?TagInput<AccountUserInfo>;
  createThreadPressed = false;

  componentDidMount() {
    setOnPressCreateThread(this.onPressCreateThread);
    this.searchUsers('');
  }

  componentWillUnmount() {
    setOnPressCreateThread(null);
  }

  componentDidUpdate(prevProps: Props) {
    const oldReduxParentThreadInfo = prevProps.parentThreadInfo;
    const newReduxParentThreadInfo = this.props.parentThreadInfo;
    if (
      newReduxParentThreadInfo &&
      newReduxParentThreadInfo !== oldReduxParentThreadInfo
    ) {
      this.props.navigation.setParams({
        parentThreadInfo: newReduxParentThreadInfo,
      });
    }
  }

  static getParentThreadInfo(props: { navigation: NavProp }): ?ThreadInfo {
    return props.navigation.state.params.parentThreadInfo;
  }

  userSearchResultsSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.usernameInputText,
    (propsAndState: PropsAndState) => propsAndState.otherUserInfos,
    (propsAndState: PropsAndState) => propsAndState.userSearchIndex,
    (propsAndState: PropsAndState) => propsAndState.userInfoInputArray,
    (propsAndState: PropsAndState) =>
      ComposeThread.getParentThreadInfo(propsAndState),
    (
      text: string,
      userInfos: { [id: string]: AccountUserInfo },
      searchIndex: SearchIndex,
      userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
      parentThreadInfo: ?ThreadInfo,
    ) =>
      getUserSearchResults(
        text,
        userInfos,
        searchIndex,
        userInfoInputArray.map(userInfo => userInfo.id),
        parentThreadInfo,
      ),
  );

  get userSearchResults() {
    return this.userSearchResultsSelector({ ...this.props, ...this.state });
  }

  existingThreadsSelector = createSelector(
    (propsAndState: PropsAndState) =>
      ComposeThread.getParentThreadInfo(propsAndState),
    (propsAndState: PropsAndState) => propsAndState.threadInfos,
    (propsAndState: PropsAndState) => propsAndState.userInfoInputArray,
    (
      parentThreadInfo: ?ThreadInfo,
      threadInfos: { [id: string]: ThreadInfo },
      userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
    ) => {
      const userIDs = userInfoInputArray.map(userInfo => userInfo.id);
      if (userIDs.length === 0) {
        return [];
      }
      return _flow(
        _filter(
          (threadInfo: ThreadInfo) =>
            threadInChatList(threadInfo) &&
            (!parentThreadInfo ||
              threadInfo.parentThreadID === parentThreadInfo.id) &&
            userIDs.every(userID => userIsMember(threadInfo, userID)),
        ),
        _sortBy(
          ([
            'members.length',
            (threadInfo: ThreadInfo) => (threadInfo.name ? 1 : 0),
          ]: $ReadOnlyArray<string | ((threadInfo: ThreadInfo) => mixed)>),
        ),
      )(threadInfos);
    },
  );

  get existingThreads() {
    return this.existingThreadsSelector({ ...this.props, ...this.state });
  }

  render() {
    let existingThreadsSection = null;
    const { existingThreads, userSearchResults } = this;
    if (existingThreads.length > 0) {
      existingThreadsSection = (
        <View style={this.props.styles.existingThreads}>
          <View style={this.props.styles.existingThreadsRow}>
            <Text style={this.props.styles.existingThreadsLabel}>
              Existing threads
            </Text>
          </View>
          <View style={this.props.styles.existingThreadList}>
            <ThreadList
              threadInfos={existingThreads}
              onSelect={this.onSelectExistingThread}
              itemTextStyle={this.props.styles.listItem}
            />
          </View>
        </View>
      );
    }
    let parentThreadRow = null;
    const parentThreadInfo = ComposeThread.getParentThreadInfo(this.props);
    if (parentThreadInfo) {
      const threadType = this.props.navigation.getParam('threadType');
      invariant(
        threadType !== undefined && threadType !== null,
        `no threadType provided for ${parentThreadInfo.id}`,
      );
      const threadVisibilityColor = this.props.colors.modalForegroundLabel;
      parentThreadRow = (
        <View style={this.props.styles.parentThreadRow}>
          <ThreadVisibility
            threadType={threadType}
            color={threadVisibilityColor}
          />
          <Text style={this.props.styles.parentThreadLabel}>within</Text>
          <Text style={this.props.styles.parentThreadName}>
            {parentThreadInfo.uiName}
          </Text>
        </View>
      );
    }
    const inputProps = {
      ...tagInputProps,
      onSubmitEditing: this.onPressCreateThread,
    };
    return (
      <View style={this.props.styles.container}>
        {parentThreadRow}
        <View style={this.props.styles.userSelectionRow}>
          <Text style={this.props.styles.tagInputLabel}>To: </Text>
          <View style={this.props.styles.tagInputContainer}>
            <TagInput
              value={this.state.userInfoInputArray}
              onChange={this.onChangeTagInput}
              text={this.state.usernameInputText}
              onChangeText={this.setUsernameInputText}
              labelExtractor={this.tagDataLabelExtractor}
              inputProps={inputProps}
              innerRef={this.tagInputRef}
            />
          </View>
        </View>
        <View style={this.props.styles.userList}>
          <UserList
            userInfos={userSearchResults}
            onSelect={this.onUserSelect}
            itemTextStyle={this.props.styles.listItem}
          />
        </View>
        {existingThreadsSection}
      </View>
    );
  }

  tagInputRef = (tagInput: ?TagInput<AccountUserInfo>) => {
    this.tagInput = tagInput;
  };

  onChangeTagInput = (userInfoInputArray: $ReadOnlyArray<AccountUserInfo>) => {
    this.setState({ userInfoInputArray });
  };

  tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

  setUsernameInputText = (text: string) => {
    this.searchUsers(text);
    this.setState({ usernameInputText: text });
  };

  searchUsers(usernamePrefix: string) {
    this.props.dispatchActionPromise(
      searchUsersActionTypes,
      this.props.searchUsers(usernamePrefix),
    );
  }

  onUserSelect = (userID: string) => {
    for (let existingUserInfo of this.state.userInfoInputArray) {
      if (userID === existingUserInfo.id) {
        return;
      }
    }
    const userInfoInputArray = [
      ...this.state.userInfoInputArray,
      this.props.otherUserInfos[userID],
    ];
    this.setState({
      userInfoInputArray,
      usernameInputText: '',
    });
  };

  onPressCreateThread = () => {
    if (this.createThreadPressed) {
      return;
    }
    this.createThreadPressed = true;
    if (this.state.userInfoInputArray.length === 0) {
      Alert.alert(
        'Chatting to yourself?',
        'Are you sure you want to create a thread containing only yourself?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: this.dispatchNewChatThreadAction },
        ],
      );
    } else {
      this.dispatchNewChatThreadAction();
    }
  };

  dispatchNewChatThreadAction = () => {
    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newChatThreadAction(),
    );
  };

  async newChatThreadAction() {
    this.props.navigation.setParams({ createButtonDisabled: true });
    try {
      const threadTypeParam = this.props.navigation.getParam('threadType');
      const threadType = threadTypeParam
        ? threadTypeParam
        : threadTypes.CHAT_SECRET;
      const initialMemberIDs = this.state.userInfoInputArray.map(
        (userInfo: AccountUserInfo) => userInfo.id,
      );
      const parentThreadInfo = ComposeThread.getParentThreadInfo(this.props);
      return await this.props.newThread({
        type: threadType,
        parentThreadID: parentThreadInfo ? parentThreadInfo.id : null,
        initialMemberIDs,
        color: parentThreadInfo ? parentThreadInfo.color : null,
      });
    } catch (e) {
      this.createThreadPressed = false;
      this.props.navigation.setParams({ createButtonDisabled: false });
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
        { cancelable: false },
      );
      throw e;
    }
  }

  onErrorAcknowledged = () => {
    invariant(this.tagInput, 'tagInput should be set');
    this.tagInput.focus();
  };

  onUnknownErrorAlertAcknowledged = () => {
    this.setState({ usernameInputText: '' }, this.onErrorAcknowledged);
  };

  onSelectExistingThread = (threadID: string) => {
    const threadInfo = this.props.threadInfos[threadID];
    this.props.navigation.navigate({
      routeName: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };
}

const styles = {
  container: {
    flex: 1,
  },
  parentThreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'modalSubtext',
    paddingVertical: 6,
    paddingLeft: 12,
  },
  parentThreadLabel: {
    fontSize: 16,
    color: 'modalSubtextLabel',
    paddingLeft: 6,
  },
  parentThreadName: {
    fontSize: 16,
    paddingLeft: 6,
    color: 'modalForegroundLabel',
  },
  userSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'modalForeground',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
  },
  tagInputLabel: {
    paddingLeft: 12,
    fontSize: 16,
    color: 'modalForegroundSecondaryLabel',
  },
  tagInputContainer: {
    flex: 1,
    marginLeft: 8,
    paddingRight: 12,
  },
  userList: {
    flex: 1,
    paddingLeft: 35,
    paddingRight: 12,
    backgroundColor: 'modalBackground',
  },
  listItem: {
    color: 'modalForegroundLabel',
  },
  existingThreadsRow: {
    backgroundColor: 'modalForeground',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: 'modalForegroundBorder',
  },
  existingThreadsLabel: {
    textAlign: 'center',
    paddingLeft: 12,
    fontSize: 16,
    color: 'modalForegroundSecondaryLabel',
  },
  existingThreadList: {
    flex: 1,
    paddingRight: 12,
    backgroundColor: 'modalBackground',
  },
  existingThreads: {
    flex: 1,
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(newThreadActionTypes);
registerFetchKey(searchUsersActionTypes);

export default connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    let reduxParentThreadInfo = null;
    const parentThreadInfo = ownProps.navigation.state.params.parentThreadInfo;
    if (parentThreadInfo) {
      reduxParentThreadInfo = threadInfoSelector(state)[parentThreadInfo.id];
    }
    return {
      parentThreadInfo: reduxParentThreadInfo,
      loadingStatus: loadingStatusSelector(state),
      otherUserInfos: userInfoSelectorForOtherMembersOfThread((null: ?string))(
        state,
      ),
      userSearchIndex: userSearchIndexForOtherMembersOfThread(null)(state),
      threadInfos: threadInfoSelector(state),
      colors: colorsSelector(state),
      styles: stylesSelector(state),
    };
  },
  { newThread, searchUsers },
)(ComposeThread);
