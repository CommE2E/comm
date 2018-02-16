// @flow

import type { AppState } from '../../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AccountUserInfo } from 'lib/types/user-types';
import { accountUserInfoPropType } from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChangeThreadSettingsResult } from 'lib/actions/thread-actions';
import type { SearchUsersResult } from 'lib/actions/user-actions';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';

import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import { getUserSearchResults } from 'lib/shared/search-utils';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  addUsersToThreadActionTypes,
  addUsersToThread,
} from 'lib/actions/thread-actions';
import {
  searchUsersActionTypes,
  searchUsers,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadActualMembers } from 'lib/shared/thread-utils';

import UserList from '../../components/user-list.react';
import TagInput from '../../components/tag-input.react';
import Button from '../../components/button.react';
import { iosKeyboardHeight } from '../../dimensions';

const tagInputProps = {
  placeholder: "Select users to add",
  autoFocus: true,
};

type Props = {
  threadInfo: ThreadInfo,
  close: () => void,
  // Redux state
  otherUserInfos: {[id: string]: AccountUserInfo},
  userSearchIndex: SearchIndex,
  addUsersLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  addUsersToThread: (
    threadID: string,
    userIDs: string[],
  ) => Promise<ChangeThreadSettingsResult>,
  searchUsers: (usernamePrefix: string) => Promise<SearchUsersResult>,
};
type State = {|
  userSearchResults: $ReadOnlyArray<AccountUserInfo>,
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
class AddUsersModal extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    close: PropTypes.func.isRequired,
    otherUserInfos: PropTypes.objectOf(accountUserInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    addUsersLoadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    addUsersToThread: PropTypes.func.isRequired,
    searchUsers: PropTypes.func.isRequired,
  };
  mounted = false;
  tagInput: ?TagInput<AccountUserInfo> = null;

  constructor(props: Props) {
    super(props);
    const userSearchResults = AddUsersModal.getSearchResults(
      "",
      props.otherUserInfos,
      props.userSearchIndex,
      [],
      props.threadInfo,
    );
    this.state = {
      userSearchResults,
      usernameInputText: "",
      userInfoInputArray: [],
    }
  }

  static getSearchResults(
    text: string,
    userInfos: {[id: string]: AccountUserInfo},
    searchIndex: SearchIndex,
    userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
    threadInfo: ThreadInfo,
  ) {
    const excludeUserIDs = userInfoInputArray
      .map(userInfo => userInfo.id)
      .concat(threadActualMembers(threadInfo.members));
    return getUserSearchResults(
      text,
      userInfos,
      searchIndex,
      excludeUserIDs,
    );
  }

  componentDidMount() {
    this.mounted = true;
    this.searchUsers("");
  }

  searchUsers(usernamePrefix: string) {
    this.props.dispatchActionPromise(
      searchUsersActionTypes,
      this.props.searchUsers(usernamePrefix),
    );
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentWillReceiveProps(nextProps: Props) {
    if (!this.mounted) {
      return;
    }
    if (
      this.props.otherUserInfos !== nextProps.otherUserInfos ||
      this.props.userSearchIndex !== nextProps.userSearchIndex ||
      this.props.threadInfo !== nextProps.threadInfo
    ) {
      const userSearchResults = AddUsersModal.getSearchResults(
        this.state.usernameInputText,
        nextProps.otherUserInfos,
        nextProps.userSearchIndex,
        this.state.userInfoInputArray,
        nextProps.threadInfo,
      );
      this.setState({ userSearchResults });
    }
  }

  render() {
    let addButton = null;
    const inputLength = this.state.userInfoInputArray.length;
    if (inputLength > 0) {
      let activityIndicator = null;
      if (this.props.addUsersLoadingStatus === "loading") {
        activityIndicator = (
          <View style={styles.activityIndicator}>
            <ActivityIndicator color="#555" />
          </View>
        );
      }
      const addButtonText = `Add (${inputLength})`;
      addButton = (
        <Button
          onPress={this.onPressAdd}
          style={styles.addButton}
          disabled={this.props.addUsersLoadingStatus === "loading"}
        >
          {activityIndicator}
          <Text style={styles.addText}>{addButtonText}</Text>
        </Button>
      );
    }

    let cancelButton;
    if (this.props.addUsersLoadingStatus !== "loading") {
      cancelButton = (
        <Button onPress={this.props.close} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Button>
      );
    } else {
      cancelButton = (
        <View />
      );
    }

    const content = (
      <View style={styles.modal}>
        <TagInput
          value={this.state.userInfoInputArray}
          onChange={this.onChangeTagInput}
          text={this.state.usernameInputText}
          onChangeText={this.setUsernameInputText}
          labelExtractor={this.tagDataLabelExtractor}
          defaultInputWidth={160}
          maxHeight={36}
          inputProps={tagInputProps}
          ref={this.tagInputRef}
        />
        <UserList
          userInfos={this.state.userSearchResults}
          onSelect={this.onUserSelect}
        />
        <View style={styles.buttons}>
          {cancelButton}
          {addButton}
        </View>
      </View>
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
    if (this.props.addUsersLoadingStatus === "loading") {
      return;
    }
    const userSearchResults = AddUsersModal.getSearchResults(
      this.state.usernameInputText,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray,
      this.props.threadInfo,
    );
    this.setState({ userInfoInputArray, userSearchResults });
  }

  tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

  setUsernameInputText = (text: string) => {
    if (this.props.addUsersLoadingStatus === "loading") {
      return;
    }
    const userSearchResults = AddUsersModal.getSearchResults(
      text,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      this.state.userInfoInputArray,
      this.props.threadInfo,
    );
    this.searchUsers(text);
    this.setState({ usernameInputText: text, userSearchResults });
  }

  onUserSelect = (userID: string) => {
    if (this.props.addUsersLoadingStatus === "loading") {
      return;
    }
    for (let existingUserInfo of this.state.userInfoInputArray) {
      if (userID === existingUserInfo.id) {
        return;
      }
    }
    const userInfoInputArray = [
      ...this.state.userInfoInputArray,
      this.props.otherUserInfos[userID],
    ];
    const userSearchResults = AddUsersModal.getSearchResults(
      "",
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray,
      this.props.threadInfo,
    );
    this.setState({
      userInfoInputArray,
      usernameInputText: "",
      userSearchResults,
    });
  }

  onPressAdd = () => {
    this.props.dispatchActionPromise(
      addUsersToThreadActionTypes,
      this.addUsersToThread(),
    );
  }

  async addUsersToThread() {
    try {
      const result = await this.props.addUsersToThread(
        this.props.threadInfo.id,
        this.state.userInfoInputArray.map((userInfo) => userInfo.id),
      );
      this.props.close();
      return result;
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
    invariant(this.tagInput, "nameInput should be set");
    this.tagInput.focus();
  }

  onUnknownErrorAlertAcknowledged = () => {
    const usernameInputText = "";
    const userInfoInputArray = [];
    const userSearchResults = AddUsersModal.getSearchResults(
      usernameInputText,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray,
      this.props.threadInfo,
    );
    this.setState(
      {
        userInfoInputArray,
        usernameInputText,
        userSearchResults,
      },
      this.onErrorAcknowledged,
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 15,
    marginTop: 100,
  },
  modal: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: '#AAAAAA',
  },
  cancelText: {
    fontSize: 18,
    color: '#444444',
  },
  addButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: '#AACCAA',
    flexDirection: 'row',
  },
  activityIndicator: {
    paddingRight: 6,
  },
  addText: {
    fontSize: 18,
    color: '#444444',
  },
});

const addUsersToThreadLoadingStatusSelector
  = createLoadingStatusSelector(addUsersToThreadActionTypes);
registerFetchKey(searchUsersActionTypes);

export default connect(
  (state: AppState) => ({
    otherUserInfos: userInfoSelectorForOtherMembersOfThread(null)(state),
    userSearchIndex: userSearchIndexForOtherMembersOfThread(null)(state),
    addUsersLoadingStatus: addUsersToThreadLoadingStatusSelector(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ addUsersToThread, searchUsers }),
)(AddUsersModal);
