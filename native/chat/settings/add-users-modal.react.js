// @flow

import type { AppState } from '../../redux-setup';
import {
  type ThreadInfo,
  threadInfoPropType,
  type ChangeThreadSettingsResult,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import {
  type AccountUserInfo,
  accountUserInfoPropType,
  type UserListItem,
} from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { UserSearchResult } from 'lib/types/search-types';
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
import PropTypes from 'prop-types';
import invariant from 'invariant';

import {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import { getUserSearchResults } from 'lib/shared/search-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import {
  searchUsersActionTypes,
  searchUsers,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadActualMembers } from 'lib/shared/thread-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import UserList from '../../components/user-list.react';
import TagInput from '../../components/tag-input.react';
import Button from '../../components/button.react';
import { iosKeyboardOffset } from '../../dimensions';

const tagInputProps = {
  placeholder: "Select users to add",
  autoFocus: true,
};

type Props = {
  threadInfo: ThreadInfo,
  close: () => void,
  // Redux state
  parentThreadInfo: ?ThreadInfo,
  otherUserInfos: {[id: string]: AccountUserInfo},
  userSearchIndex: SearchIndex,
  changeThreadSettingsLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsResult>,
  searchUsers: (usernamePrefix: string) => Promise<UserSearchResult>,
};
type State = {|
  userSearchResults: $ReadOnlyArray<UserListItem>,
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
class AddUsersModal extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    close: PropTypes.func.isRequired,
    parentThreadInfo: threadInfoPropType,
    otherUserInfos: PropTypes.objectOf(accountUserInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    changeThreadSettingsLoadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
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
      props.parentThreadInfo,
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
    parentThreadInfo: ?ThreadInfo,
  ) {
    const excludeUserIDs = userInfoInputArray
      .map(userInfo => userInfo.id)
      .concat(threadActualMembers(threadInfo.members));
    return getUserSearchResults(
      text,
      userInfos,
      searchIndex,
      excludeUserIDs,
      parentThreadInfo,
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
        nextProps.parentThreadInfo,
      );
      this.setState({ userSearchResults });
    }
  }

  render() {
    let addButton = null;
    const inputLength = this.state.userInfoInputArray.length;
    if (inputLength > 0) {
      let activityIndicator = null;
      if (this.props.changeThreadSettingsLoadingStatus === "loading") {
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
          disabled={this.props.changeThreadSettingsLoadingStatus === "loading"}
        >
          {activityIndicator}
          <Text style={styles.addText}>{addButtonText}</Text>
        </Button>
      );
    }

    let cancelButton;
    if (this.props.changeThreadSettingsLoadingStatus !== "loading") {
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
          keyboardVerticalOffset={iosKeyboardOffset}
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
    if (this.props.changeThreadSettingsLoadingStatus === "loading") {
      return;
    }
    const userSearchResults = AddUsersModal.getSearchResults(
      this.state.usernameInputText,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray,
      this.props.threadInfo,
      this.props.parentThreadInfo,
    );
    this.setState({ userInfoInputArray, userSearchResults });
  }

  tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

  setUsernameInputText = (text: string) => {
    if (this.props.changeThreadSettingsLoadingStatus === "loading") {
      return;
    }
    const userSearchResults = AddUsersModal.getSearchResults(
      text,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      this.state.userInfoInputArray,
      this.props.threadInfo,
      this.props.parentThreadInfo,
    );
    this.searchUsers(text);
    this.setState({ usernameInputText: text, userSearchResults });
  }

  onUserSelect = (userID: string) => {
    if (this.props.changeThreadSettingsLoadingStatus === "loading") {
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
      this.props.parentThreadInfo,
    );
    this.setState({
      userInfoInputArray,
      usernameInputText: "",
      userSearchResults,
    });
  }

  onPressAdd = () => {
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.addUsersToThread(),
    );
  }

  async addUsersToThread() {
    try {
      const newMemberIDs =
        this.state.userInfoInputArray.map((userInfo) => userInfo.id);
      const result = await this.props.changeThreadSettings({
        threadID: this.props.threadInfo.id,
        changes: { newMemberIDs },
      });
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
      this.props.parentThreadInfo,
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

const changeThreadSettingsLoadingStatusSelector
  = createLoadingStatusSelector(changeThreadSettingsActionTypes);
registerFetchKey(searchUsersActionTypes);

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    let parentThreadInfo = null;
    const parentThreadID = ownProps.threadInfo.parentThreadID;
    if (parentThreadID) {
      parentThreadInfo = threadInfoSelector(state)[parentThreadID];
    }
    return {
      parentThreadInfo,
      otherUserInfos: userInfoSelectorForOtherMembersOfThread(null)(state),
      userSearchIndex: userSearchIndexForOtherMembersOfThread(null)(state),
      changeThreadSettingsLoadingStatus:
        changeThreadSettingsLoadingStatusSelector(state),
    };
  },
  { changeThreadSettings, searchUsers },
)(AddUsersModal);
