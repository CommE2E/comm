// @flow

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
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

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
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import { threadInFilterList, userIsMember } from 'lib/shared/thread-utils';
import { getUserSearchResults } from 'lib/shared/search-utils';
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

export type ComposeThreadParams = {|
  threadType?: ThreadType,
  parentThreadInfo?: ThreadInfo,
|};

type Props = {|
  navigation: ChatNavigationProp<'ComposeThread'>,
  route: NavigationRoute<'ComposeThread'>,
  // Redux state
  parentThreadInfo: ?ThreadInfo,
  loadingStatus: LoadingStatus,
  otherUserInfos: { [id: string]: AccountUserInfo },
  userSearchIndex: SearchIndex,
  threadInfos: { [id: string]: ThreadInfo },
  colors: Colors,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  newThread: (request: NewThreadRequest) => Promise<NewThreadResult>,
|};
type State = {|
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
type PropsAndState = {| ...Props, ...State |};
class ComposeThread extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      setParams: PropTypes.func.isRequired,
      setOptions: PropTypes.func.isRequired,
      navigate: PropTypes.func.isRequired,
      pushNewThread: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      key: PropTypes.string.isRequired,
      params: PropTypes.shape({
        threadType: threadTypePropType,
        parentThreadInfo: threadInfoPropType,
      }).isRequired,
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
  };
  state = {
    usernameInputText: '',
    userInfoInputArray: [],
  };
  tagInput: ?TagInput<AccountUserInfo>;
  createThreadPressed = false;
  waitingOnThreadID: ?string;

  constructor(props: Props) {
    super(props);
    this.setLinkButton(true);
  }

  setLinkButton(enabled: boolean) {
    this.props.navigation.setOptions({
      headerRight: () => (
        <LinkButton
          text="Create"
          onPress={this.onPressCreateThread}
          disabled={!enabled}
        />
      ),
    });
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

    if (
      this.waitingOnThreadID &&
      this.props.threadInfos[this.waitingOnThreadID] &&
      !prevProps.threadInfos[this.waitingOnThreadID]
    ) {
      const threadInfo = this.props.threadInfos[this.waitingOnThreadID];
      this.props.navigation.pushNewThread(threadInfo);
    }
  }

  static getParentThreadInfo(props: {
    route: NavigationRoute<'ComposeThread'>,
  }): ?ThreadInfo {
    return props.route.params.parentThreadInfo;
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
    ) => {
      const results = getUserSearchResults(
        text,
        userInfos,
        searchIndex,
        userInfoInputArray.map(userInfo => userInfo.id),
        parentThreadInfo,
      );
      return results.map(({ memberOfParentThread, ...result }) => ({
        ...result,
        notice: !memberOfParentThread ? 'not in parent thread' : undefined,
      }));
    },
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
            threadInFilterList(threadInfo) &&
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
      const threadType = this.props.route.params.threadType;
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
    this.setState({ usernameInputText: text });
  };

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

  dispatchNewChatThreadAction = async () => {
    this.createThreadPressed = true;
    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newChatThreadAction(),
    );
  };

  async newChatThreadAction() {
    this.setLinkButton(false);
    try {
      const threadTypeParam = this.props.route.params.threadType;
      const threadType = threadTypeParam
        ? threadTypeParam
        : threadTypes.CHAT_SECRET;
      const initialMemberIDs = this.state.userInfoInputArray.map(
        (userInfo: AccountUserInfo) => userInfo.id,
      );
      const parentThreadInfo = ComposeThread.getParentThreadInfo(this.props);
      const result = await this.props.newThread({
        type: threadType,
        parentThreadID: parentThreadInfo ? parentThreadInfo.id : null,
        initialMemberIDs,
        color: parentThreadInfo ? parentThreadInfo.color : null,
      });
      this.waitingOnThreadID = result.newThreadID;
      return result;
    } catch (e) {
      this.createThreadPressed = false;
      this.setLinkButton(true);
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
      name: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };
}

const styles = {
  container: {
    flex: 1,
  },
  existingThreadList: {
    backgroundColor: 'modalBackground',
    flex: 1,
    paddingRight: 12,
  },
  existingThreads: {
    flex: 1,
  },
  existingThreadsLabel: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    paddingLeft: 12,
    textAlign: 'center',
  },
  existingThreadsRow: {
    backgroundColor: 'modalForeground',
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  listItem: {
    color: 'modalForegroundLabel',
  },
  parentThreadLabel: {
    color: 'modalSubtextLabel',
    fontSize: 16,
    paddingLeft: 6,
  },
  parentThreadName: {
    color: 'modalForegroundLabel',
    fontSize: 16,
    paddingLeft: 6,
  },
  parentThreadRow: {
    alignItems: 'center',
    backgroundColor: 'modalSubtext',
    flexDirection: 'row',
    paddingLeft: 12,
    paddingVertical: 6,
  },
  tagInputContainer: {
    flex: 1,
    marginLeft: 8,
    paddingRight: 12,
  },
  tagInputLabel: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    paddingLeft: 12,
  },
  userList: {
    backgroundColor: 'modalBackground',
    flex: 1,
    paddingLeft: 35,
    paddingRight: 12,
  },
  userSelectionRow: {
    alignItems: 'center',
    backgroundColor: 'modalForeground',
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
    flexDirection: 'row',
    paddingVertical: 6,
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(newThreadActionTypes);

export default connect(
  (
    state: AppState,
    ownProps: {
      route: NavigationRoute<'ComposeThread'>,
    },
  ) => {
    let reduxParentThreadInfo = null;
    const parentThreadInfo = ownProps.route.params.parentThreadInfo;
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
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
    };
  },
  { newThread },
)(ComposeThread);
