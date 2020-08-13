// @flow

import type { AppState } from '../../redux/redux-setup';
import {
  type ThreadInfo,
  threadInfoPropType,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import {
  type AccountUserInfo,
  accountUserInfoPropType,
} from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { RootNavigationProp } from '../../navigation/root-navigator.react';
import type { NavigationRoute } from '../../navigation/route-names';

import * as React from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import { createSelector } from 'reselect';

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
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadActualMembers } from 'lib/shared/thread-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import UserList from '../../components/user-list.react';
import TagInput from '../../components/tag-input.react';
import Button from '../../components/button.react';
import Modal from '../../components/modal.react';
import { styleSelector } from '../../themes/colors';

const tagInputProps = {
  placeholder: 'Select users to add',
  autoFocus: true,
  returnKeyType: 'go',
};

export type AddUsersModalParams = {|
  presentedFrom: string,
  threadInfo: ThreadInfo,
|};

type Props = {|
  navigation: RootNavigationProp<'AddUsersModal'>,
  route: NavigationRoute<'AddUsersModal'>,
  // Redux state
  parentThreadInfo: ?ThreadInfo,
  otherUserInfos: { [id: string]: AccountUserInfo },
  userSearchIndex: SearchIndex,
  changeThreadSettingsLoadingStatus: LoadingStatus,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
|};
type State = {|
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
type PropsAndState = {| ...Props, ...State |};
class AddUsersModal extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBackOnce: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      params: PropTypes.shape({
        threadInfo: threadInfoPropType.isRequired,
      }).isRequired,
    }).isRequired,
    parentThreadInfo: threadInfoPropType,
    otherUserInfos: PropTypes.objectOf(accountUserInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    changeThreadSettingsLoadingStatus: loadingStatusPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };
  state = {
    usernameInputText: '',
    userInfoInputArray: [],
  };
  tagInput: ?TagInput<AccountUserInfo> = null;

  userSearchResultsSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.usernameInputText,
    (propsAndState: PropsAndState) => propsAndState.otherUserInfos,
    (propsAndState: PropsAndState) => propsAndState.userSearchIndex,
    (propsAndState: PropsAndState) => propsAndState.userInfoInputArray,
    (propsAndState: PropsAndState) => propsAndState.route.params.threadInfo,
    (propsAndState: PropsAndState) => propsAndState.parentThreadInfo,
    (
      text: string,
      userInfos: { [id: string]: AccountUserInfo },
      searchIndex: SearchIndex,
      userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
      threadInfo: ThreadInfo,
      parentThreadInfo: ?ThreadInfo,
    ) => {
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
    },
  );

  get userSearchResults() {
    return this.userSearchResultsSelector({ ...this.props, ...this.state });
  }

  render() {
    let addButton = null;
    const inputLength = this.state.userInfoInputArray.length;
    if (inputLength > 0) {
      let activityIndicator = null;
      if (this.props.changeThreadSettingsLoadingStatus === 'loading') {
        activityIndicator = (
          <View style={this.props.styles.activityIndicator}>
            <ActivityIndicator color="white" />
          </View>
        );
      }
      const addButtonText = `Add (${inputLength})`;
      addButton = (
        <Button
          onPress={this.onPressAdd}
          style={this.props.styles.addButton}
          disabled={this.props.changeThreadSettingsLoadingStatus === 'loading'}
        >
          {activityIndicator}
          <Text style={this.props.styles.addText}>{addButtonText}</Text>
        </Button>
      );
    }

    let cancelButton;
    if (this.props.changeThreadSettingsLoadingStatus !== 'loading') {
      cancelButton = (
        <Button onPress={this.close} style={this.props.styles.cancelButton}>
          <Text style={this.props.styles.cancelText}>Cancel</Text>
        </Button>
      );
    } else {
      cancelButton = <View />;
    }

    const inputProps = {
      ...tagInputProps,
      onSubmitEditing: this.onPressAdd,
    };
    return (
      <Modal navigation={this.props.navigation}>
        <TagInput
          value={this.state.userInfoInputArray}
          onChange={this.onChangeTagInput}
          text={this.state.usernameInputText}
          onChangeText={this.setUsernameInputText}
          labelExtractor={this.tagDataLabelExtractor}
          defaultInputWidth={160}
          maxHeight={36}
          inputProps={inputProps}
          innerRef={this.tagInputRef}
        />
        <UserList
          userInfos={this.userSearchResults}
          onSelect={this.onUserSelect}
        />
        <View style={this.props.styles.buttons}>
          {cancelButton}
          {addButton}
        </View>
      </Modal>
    );
  }

  close = () => {
    this.props.navigation.goBackOnce();
  };

  tagInputRef = (tagInput: ?TagInput<AccountUserInfo>) => {
    this.tagInput = tagInput;
  };

  onChangeTagInput = (userInfoInputArray: $ReadOnlyArray<AccountUserInfo>) => {
    if (this.props.changeThreadSettingsLoadingStatus === 'loading') {
      return;
    }
    this.setState({ userInfoInputArray });
  };

  tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

  setUsernameInputText = (text: string) => {
    if (this.props.changeThreadSettingsLoadingStatus === 'loading') {
      return;
    }
    this.setState({ usernameInputText: text });
  };

  onUserSelect = (userID: string) => {
    if (this.props.changeThreadSettingsLoadingStatus === 'loading') {
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
    this.setState({
      userInfoInputArray,
      usernameInputText: '',
    });
  };

  onPressAdd = () => {
    if (this.state.userInfoInputArray.length === 0) {
      return;
    }
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.addUsersToThread(),
    );
  };

  async addUsersToThread() {
    try {
      const newMemberIDs = this.state.userInfoInputArray.map(
        userInfo => userInfo.id,
      );
      const result = await this.props.changeThreadSettings({
        threadID: this.props.route.params.threadInfo.id,
        changes: { newMemberIDs },
      });
      this.close();
      return result;
    } catch (e) {
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
    invariant(this.tagInput, 'nameInput should be set');
    this.tagInput.focus();
  };

  onUnknownErrorAlertAcknowledged = () => {
    this.setState(
      {
        userInfoInputArray: [],
        usernameInputText: '',
      },
      this.onErrorAcknowledged,
    );
  };
}

const styles = {
  activityIndicator: {
    paddingRight: 6,
  },
  addButton: {
    backgroundColor: 'greenButton',
    borderRadius: 3,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addText: {
    color: 'white',
    fontSize: 18,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: 'modalButton',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelText: {
    color: 'modalButtonLabel',
    fontSize: 18,
  },
};
const stylesSelector = styleSelector(styles);

const changeThreadSettingsLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
);

export default connect(
  (
    state: AppState,
    ownProps: {
      route: NavigationRoute<'AddUsersModal'>,
    },
  ) => {
    let parentThreadInfo = null;
    const { parentThreadID } = ownProps.route.params.threadInfo;
    if (parentThreadID) {
      parentThreadInfo = threadInfoSelector(state)[parentThreadID];
    }
    return {
      parentThreadInfo,
      otherUserInfos: userInfoSelectorForOtherMembersOfThread((null: ?string))(
        state,
      ),
      userSearchIndex: userSearchIndexForOtherMembersOfThread(null)(state),
      changeThreadSettingsLoadingStatus: changeThreadSettingsLoadingStatusSelector(
        state,
      ),
      styles: stylesSelector(state),
    };
  },
  { changeThreadSettings },
)(AddUsersModal);
