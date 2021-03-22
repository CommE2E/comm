// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { createSelector } from 'reselect';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import { getPotentialMemberItems } from 'lib/shared/search-utils';
import { threadActualMembers } from 'lib/shared/thread-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import {
  type ThreadInfo,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
} from 'lib/types/thread-types';
import { type AccountUserInfo } from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
import Modal from '../../components/modal.react';
import { createTagInput, BaseTagInput } from '../../components/tag-input.react';
import UserList from '../../components/user-list.react';
import type { RootNavigationProp } from '../../navigation/root-navigator.react';
import type { NavigationRoute } from '../../navigation/route-names';
import { useSelector } from '../../redux/redux-utils';
import { useStyles } from '../../themes/colors';

const TagInput = createTagInput<AccountUserInfo>();

const tagInputProps = {
  placeholder: 'Select users to add',
  autoFocus: true,
  returnKeyType: 'go',
};

export type AddUsersModalParams = {|
  +presentedFrom: string,
  +threadInfo: ThreadInfo,
|};

type BaseProps = {|
  +navigation: RootNavigationProp<'AddUsersModal'>,
  +route: NavigationRoute<'AddUsersModal'>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +parentThreadInfo: ?ThreadInfo,
  +otherUserInfos: { [id: string]: AccountUserInfo },
  +userSearchIndex: SearchIndex,
  +changeThreadSettingsLoadingStatus: LoadingStatus,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
|};
type State = {|
  +usernameInputText: string,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
type PropsAndState = {| ...Props, ...State |};
class AddUsersModal extends React.PureComponent<Props, State> {
  state: State = {
    usernameInputText: '',
    userInfoInputArray: [],
  };
  tagInput: ?BaseTagInput<AccountUserInfo> = null;

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

      return getPotentialMemberItems(
        text,
        userInfos,
        searchIndex,
        excludeUserIDs,
        parentThreadInfo,
        threadInfo.type,
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
      <Modal>
        <TagInput
          value={this.state.userInfoInputArray}
          onChange={this.onChangeTagInput}
          text={this.state.usernameInputText}
          onChangeText={this.setUsernameInputText}
          labelExtractor={this.tagDataLabelExtractor}
          defaultInputWidth={160}
          maxHeight={36}
          inputProps={inputProps}
          ref={this.tagInputRef}
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

  tagInputRef = (tagInput: ?BaseTagInput<AccountUserInfo>) => {
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
    for (const existingUserInfo of this.state.userInfoInputArray) {
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

const unboundStyles = {
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

export default React.memo<BaseProps>(function ConnectedAddUsersModal(
  props: BaseProps,
) {
  const { parentThreadID } = props.route.params.threadInfo;

  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);
  const changeThreadSettingsLoadingStatus = useSelector(
    createLoadingStatusSelector(changeThreadSettingsActionTypes),
  );
  const styles = useStyles(unboundStyles);
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);
  return (
    <AddUsersModal
      {...props}
      parentThreadInfo={parentThreadInfo}
      otherUserInfos={otherUserInfos}
      userSearchIndex={userSearchIndex}
      changeThreadSettingsLoadingStatus={changeThreadSettingsLoadingStatus}
      styles={styles}
      dispatchActionPromise={dispatchActionPromise}
      changeThreadSettings={callChangeThreadSettings}
    />
  );
});
