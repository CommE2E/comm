// @flow

import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  type VisibilityRules,
  visibilityRules,
} from 'lib/types/thread-types';
import type { AccountUserInfo } from 'lib/types/user-types';
import { accountUserInfoPropType } from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { SearchUsersResult } from 'lib/actions/user-actions';
import type { NewThreadResult } from 'lib/actions/thread-actions';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _sortBy from 'lodash/fp/sortBy';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  newThreadActionTypes,
  newChatThread,
} from 'lib/actions/thread-actions';
import {
  searchUsersActionTypes,
  searchUsers,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import {
  generateRandomColor,
  threadHasPermission,
  viewerIsMember,
} from 'lib/shared/thread-utils';
import { getUserSearchResults } from 'lib/shared/search-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { threadPermissions } from 'lib/types/thread-types';

import TagInput from '../components/tag-input.react';
import UserList from '../components/user-list.react';
import ThreadList from '../components/thread-list.react';
import LinkButton from '../components/link-button.react';
import { MessageListRouteName } from './message-list.react';
import { registerChatScreen } from './chat-screen-registry';
import { iosKeyboardHeight } from '../dimensions';

const tagInputProps = {
  placeholder: "username",
  autoFocus: true,
  returnKeyType: "go",
};

const segmentedPrivacyOptions = ['Public', 'Secret'];

type Props = {
  navigation: NavigationScreenProp<NavigationRoute>,
  // Redux state
  loadingStatus: LoadingStatus,
  parentThreadInfo: ?ThreadInfo,
  otherUserInfos: {[id: string]: AccountUserInfo},
  userSearchIndex: SearchIndex,
  threadInfos: {[id: string]: ThreadInfo},
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  newChatThread: (
    name: string,
    ourVisibilityRules: VisibilityRules,
    color: string,
    userIDs: string[],
    parentThreadID: ?string,
  ) => Promise<NewThreadResult>,
  searchUsers: (usernamePrefix: string) => Promise<SearchUsersResult>,
};
type State = {
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  userSearchResults: $ReadOnlyArray<AccountUserInfo>,
  tagInputHeight: number,
  existingThreads: ThreadInfo[],
};
class InnerComposeThread extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
      }).isRequired,
      setParams: PropTypes.func.isRequired,
      goBack: PropTypes.func.isRequired,
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    parentThreadInfo: threadInfoPropType,
    otherUserInfos: PropTypes.objectOf(accountUserInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    threadInfos: PropTypes.objectOf(threadInfoPropType).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    newChatThread: PropTypes.func.isRequired,
    searchUsers: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: 'Compose thread',
    headerRight: (
      <LinkButton
        text="Create"
        onPress={() => navigation.state.params.onPressCreateThread()}
      />
    ),
    headerBackTitle: "Back",
  });
  mounted = false;
  tagInput: ?TagInput<AccountUserInfo>;

  constructor(props: Props) {
    super(props);
    const userSearchResults = getUserSearchResults(
      "",
      props.otherUserInfos,
      props.userSearchIndex,
      [],
    );
    this.state = {
      usernameInputText: "",
      userInfoInputArray: [],
      userSearchResults,
      tagInputHeight: 36,
      existingThreads: [],
    };
  }

  componentDidMount() {
    this.mounted = true;
    registerChatScreen(this.props.navigation.state.key, this);
    this.searchUsers("");
    this.props.navigation.setParams({
      onPressCreateThread: this.onPressCreateThread,
    });
  }

  componentWillUnmount() {
    this.mounted = false;
    registerChatScreen(this.props.navigation.state.key, null);
  }

  canReset = () => false;

  componentWillReceiveProps(nextProps: Props) {
    if (!this.mounted) {
      return;
    }
    const newState = {};
    if (
      this.props.otherUserInfos !== nextProps.otherUserInfos ||
      this.props.userSearchIndex !== nextProps.userSearchIndex
    ) {
      const userSearchResults = getUserSearchResults(
        this.state.usernameInputText,
        nextProps.otherUserInfos,
        nextProps.userSearchIndex,
        this.state.userInfoInputArray.map(userInfo => userInfo.id),
      );
      newState.userSearchResults = userSearchResults;
    }
    if (this.props.threadInfos !== nextProps.threadInfos) {
      const existingThreads = InnerComposeThread.existingThreadsWithUsers(
        nextProps,
        this.state,
      );
      newState.existingThreads = existingThreads;
    }
    if (Object.keys(newState).length > 0) {
      this.setState(newState);
    }
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (this.state.userInfoInputArray !== nextState.userInfoInputArray) {
      const existingThreads = InnerComposeThread.existingThreadsWithUsers(
        nextProps,
        nextState,
      );
      this.setState({ existingThreads });
    }
  }

  static existingThreadsWithUsers(props: Props, state: State) {
    const userIDs = state.userInfoInputArray.map(userInfo => userInfo.id);
    if (userIDs.length === 0) {
      return [];
    }
    return _flow(
      _filter(
        (threadInfo: ThreadInfo) =>
          viewerIsMember(threadInfo) &&
          threadHasPermission(threadInfo, threadPermissions.VISIBLE) &&
          userIDs.every(
            userID => threadInfo.members.some(member => member.id === userID),
          ),
      ),
      _sortBy([
        'members.length', 
        (threadInfo: ThreadInfo) => threadInfo.name ? 1 : 0,
      ]),
    )(props.threadInfos);
  }

  render() {
    let existingThreadsSection = null;
    const existingThreads = this.state.existingThreads;
    if (existingThreads.length > 0) {
      existingThreadsSection = (
        <View style={styles.existingThreads}>
          <View style={styles.existingThreadsRow}>
            <Text style={styles.existingThreadsLabel}>
              Existing threads
            </Text>
          </View>
          <View style={styles.existingThreadList}>
            <ThreadList
              threadInfos={existingThreads}
              onSelect={this.onSelectExistingThread}
              itemTextStyle={styles.listItem}
            />
          </View>
        </View>
      );
    }
    const inputProps = {
      ...tagInputProps,
      onSubmitEditing: this.onPressCreateThread,
    };
    const content = (
      <React.Fragment>
        <View style={[
          styles.userSelectionRow,
          { height: this.state.tagInputHeight + 13 },
        ]}>
          <Text style={styles.tagInputLabel}>To: </Text>
          <View style={styles.tagInputContainer}>
            <TagInput
              value={this.state.userInfoInputArray}
              onChange={this.onChangeTagInput}
              text={this.state.usernameInputText}
              onChangeText={this.setUsernameInputText}
              onHeightChange={this.onTagInputHeightChange}
              labelExtractor={this.tagDataLabelExtractor}
              inputProps={inputProps}
              ref={this.tagInputRef}
            />
          </View>
        </View>
        <View style={styles.userList}>
          <UserList
            userInfos={this.state.userSearchResults}
            onSelect={this.onUserSelect}
            itemTextStyle={styles.listItem}
          />
        </View>
        {existingThreadsSection}
      </React.Fragment>
    );
    if (Platform.OS === "ios") {
      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={iosKeyboardHeight}
        >{content}</KeyboardAvoidingView>
      );
    } else {
      return <View style={styles.container}>{content}</View>;
    }
  }

  tagInputRef = (tagInput: ?TagInput<AccountUserInfo>) => {
    this.tagInput = tagInput;
  }

  onChangeTagInput = (userInfoInputArray: $ReadOnlyArray<AccountUserInfo>) => {
    const userSearchResults = getUserSearchResults(
      this.state.usernameInputText,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray.map(userInfo => userInfo.id),
    );
    this.setState({ userInfoInputArray, userSearchResults });
  }

  tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

  setUsernameInputText = (text: string) => {
    const userSearchResults = getUserSearchResults(
      text,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      this.state.userInfoInputArray.map(userInfo => userInfo.id),
    );
    this.searchUsers(text);
    this.setState({ usernameInputText: text, userSearchResults });
  }

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
    const userSearchResults = getUserSearchResults(
      "",
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray.map(userInfo => userInfo.id),
    );
    this.setState({
      userInfoInputArray,
      usernameInputText: "",
      userSearchResults,
    });
  }

  onTagInputHeightChange = (height: number) => {
    this.setState({ tagInputHeight: height });
  }

  onPressCreateThread = () => {
    if (this.state.userInfoInputArray.length === 0) {
      Alert.alert(
        "Chatting to yourself?",
        "Are you sure you want to create a thread containing only yourself?",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: this.dispatchNewChatThreadAction },
        ],
      );
    } else {
      this.dispatchNewChatThreadAction();
    }
  }

  dispatchNewChatThreadAction = () => {
    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newChatThreadAction(),
    );
  }

  async newChatThreadAction() {
    try {
      return await this.props.newChatThread(
        "",
        visibilityRules.CHAT_SECRET,
        generateRandomColor(),
        this.state.userInfoInputArray.map(
          (userInfo: AccountUserInfo) => userInfo.id,
        ),
        null,
      );
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onErrorAcknowledged = () => {
    invariant(this.tagInput, "tagInput should be set");
    this.tagInput.focus();
  }

  onUnknownErrorAlertAcknowledged = () => {
    this.setState(
      {
        usernameInputText: "",
        userSearchResults: [],
        tagInputHeight: 36,
      },
      this.onErrorAcknowledged,
    );
  }

  onSelectExistingThread = (threadID: string) => {
    this.props.navigation.navigate(
      MessageListRouteName,
      { threadInfo: this.props.threadInfos[threadID] },
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "white",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
  },
  tagInputLabel: {
    paddingLeft: 12,
    fontSize: 16,
    color: "#888888",
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
  },
  listItem: {
    color: "#222222",
  },
  existingThreadsRow: {
    backgroundColor: "white",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
  },
  existingThreadsLabel: {
    textAlign: 'center',
    paddingLeft: 12,
    fontSize: 16,
    color: "#888888",
  },
  existingThreadList: {
    flex: 1,
    marginRight: 12,
  },
  existingThreads: {
    flex: 1,
  },
});

const ComposeThreadRouteName = 'ComposeThread';

const loadingStatusSelector
  = createLoadingStatusSelector(newThreadActionTypes);
registerFetchKey(searchUsersActionTypes);

const ComposeThread = connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    otherUserInfos: userInfoSelectorForOtherMembersOfThread(null)(state),
    userSearchIndex: userSearchIndexForOtherMembersOfThread(null)(state),
    threadInfos: threadInfoSelector(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ newChatThread, searchUsers }),
)(InnerComposeThread);

export {
  ComposeThread,
  ComposeThreadRouteName,
};
