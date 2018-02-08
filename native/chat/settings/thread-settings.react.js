// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationParams,
} from 'react-navigation';
import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import {
  threadInfoPropType,
  threadPermissions,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { CategoryType } from './thread-settings-category.react';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { FlatList, StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import _isEqual from 'lodash/fp/isEqual';

import {
  relativeMemberInfoSelectorForMembersOfThread,
} from 'lib/selectors/user-selectors';
import {
  threadInfoSelector,
  childThreadInfos,
} from 'lib/selectors/thread-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  changeThreadSettingsActionTypes,
  leaveThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import threadWatcher from 'lib/shared/thread-watcher';

import {
  ThreadSettingsCategoryHeader,
  ThreadSettingsCategoryFooter,
} from './thread-settings-category.react';
import ThreadSettingsMember from './thread-settings-member.react';
import {
  ThreadSettingsSeeMore,
  ThreadSettingsAddMember,
  ThreadSettingsAddChildThread,
} from './thread-settings-list-action.react';
import AddUsersModal from './add-users-modal.react';
import ThreadSettingsChildThread from './thread-settings-child-thread.react';
import { registerChatScreen } from '../chat-screen-registry';
import ThreadSettingsName from './thread-settings-name.react';
import ThreadSettingsColor from './thread-settings-color.react';
import ThreadSettingsDescription from './thread-settings-description.react';
import ThreadSettingsParent from './thread-settings-parent.react';
import ThreadSettingsVisibility from './thread-settings-visibility.react';
import ThreadSettingsPushNotifs from './thread-settings-push-notifs.react';
import ThreadSettingsLeaveThread from './thread-settings-leave-thread.react';

const itemPageLength = 5;

type NavProp = NavigationScreenProp<NavigationRoute>
  & { state: { params: { threadInfo: ThreadInfo } } };
type ChatSettingsItem =
  | {|
      itemType: "header",
      key: string,
      title: string,
      categoryType: CategoryType,
    |}
  | {|
      itemType: "footer",
      key: string,
      categoryType: CategoryType,
    |}
  | {|
      itemType: "name",
      key: string,
      threadInfo: ThreadInfo,
      nameEditValue: ?string,
      nameTextHeight: ?number,
      canChangeSettings: bool,
    |}
  | {|
      itemType: "color",
      key: string,
      threadInfo: ThreadInfo,
      colorEditValue: string,
      showEditColorModal: bool,
      canChangeSettings: bool,
    |}
  | {|
      itemType: "description",
      key: string,
      threadInfo: ThreadInfo,
      descriptionEditValue: ?string,
      descriptionTextHeight: ?number,
      canChangeSettings: bool,
    |}
  | {|
      itemType: "parent",
      key: string,
      threadInfo: ThreadInfo,
      navigate: (routeName: string, params?: NavigationParams) => bool,
    |}
  | {|
      itemType: "visibility",
      key: string,
      threadInfo: ThreadInfo,
    |}
  | {|
      itemType: "pushNotifs",
      key: string,
      threadInfo: ThreadInfo,
    |}
  | {|
      itemType: "seeMore",
      key: string,
      onPress: () => void,
    |}
  | {|
      itemType: "childThread",
      key: string,
      threadInfo: ThreadInfo,
      navigate: (routeName: string, params?: NavigationParams) => bool,
    |}
  | {|
      itemType: "addChildThread",
      key: string,
      threadInfo: ThreadInfo,
      navigate: (routeName: string, params?: NavigationParams) => bool,
    |}
  | {|
      itemType: "member",
      key: string,
      memberInfo: RelativeMemberInfo,
      threadInfo: ThreadInfo,
      canEdit: bool,
    |}
  | {|
      itemType: "addMember",
      key: string,
    |}
  | {|
      itemType: "leaveThread",
      key: string,
      threadInfo: ThreadInfo,
    |};

type StateProps = {|
  threadInfo: ThreadInfo,
  threadMembers: RelativeMemberInfo[],
  childThreadInfos: ?ThreadInfo[],
  somethingIsSaving: bool,
|};
type Props = {|
  navigation: NavProp,
  // Redux state
  ...StateProps,
|};
type State = {|
  showAddUsersModal: bool,
  showMaxMembers: number,
  showMaxChildThreads: number,
  nameEditValue: ?string,
  descriptionEditValue: ?string,
  nameTextHeight: ?number,
  descriptionTextHeight: ?number,
  showEditColorModal: bool,
  colorEditValue: string,
|};
class InnerThreadSettings extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
      setParams: PropTypes.func.isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType.isRequired,
    threadMembers: PropTypes.arrayOf(relativeMemberInfoPropType).isRequired,
    childThreadInfos: PropTypes.arrayOf(threadInfoPropType),
    somethingIsSaving: PropTypes.bool.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.uiName,
    headerBackTitle: "Back",
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      showAddUsersModal: false,
      showMaxMembers: itemPageLength,
      showMaxChildThreads: itemPageLength,
      nameEditValue: null,
      descriptionEditValue: null,
      nameTextHeight: null,
      descriptionTextHeight: null,
      showEditColorModal: false,
      colorEditValue: props.threadInfo.color,
    };
  }

  componentDidMount() {
    registerChatScreen(this.props.navigation.state.key, this);
    if (!viewerIsMember(this.props.threadInfo)) {
      threadWatcher.watchID(this.props.threadInfo.id);
    }
  }

  componentWillUnmount() {
    registerChatScreen(this.props.navigation.state.key, null);
    if (!viewerIsMember(this.props.threadInfo)) {
      threadWatcher.removeID(this.props.threadInfo.id);
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      viewerIsMember(this.props.threadInfo) &&
      !viewerIsMember(nextProps.threadInfo)
    ) {
      threadWatcher.watchID(nextProps.threadInfo.id);
    } else if (
      !viewerIsMember(this.props.threadInfo) &&
      viewerIsMember(nextProps.threadInfo)
    ) {
      threadWatcher.removeID(nextProps.threadInfo.id);
    }

    if (
      !_isEqual(nextProps.threadInfo)
        (this.props.navigation.state.params.threadInfo)
    ) {
      this.props.navigation.setParams({
        threadInfo: nextProps.threadInfo,
      });
    }
    if (
      nextProps.threadInfo.color !== this.props.threadInfo.color &&
      this.state.colorEditValue === this.props.threadInfo.color
    ) {
      this.setState({ colorEditValue: nextProps.threadInfo.color });
    }
  }

  canReset = () => {
    return !this.state.showAddUsersModal &&
      (this.state.nameEditValue === null ||
        this.state.nameEditValue === undefined) &&
      !this.state.showEditColorModal &&
      !this.props.somethingIsSaving;
  }

  render() {
    const canStartEditing = this.canReset();
    const canEditThread = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_THREAD,
    );
    const canChangeSettings = canEditThread && canStartEditing;

    let listData: ChatSettingsItem[] = [];
    listData.push({
      itemType: "header",
      key: "basicsHeader",
      title: "Basics",
      categoryType: "full",
    });
    listData.push({
      itemType: "name",
      key: "name",
      threadInfo: this.props.threadInfo,
      nameEditValue: this.state.nameEditValue,
      nameTextHeight: this.state.nameTextHeight,
      canChangeSettings,
    });
    listData.push({
      itemType: "color",
      key: "color",
      threadInfo: this.props.threadInfo,
      colorEditValue: this.state.colorEditValue,
      showEditColorModal: this.state.showEditColorModal,
      canChangeSettings,
    });
    listData.push({
      itemType: "footer",
      key: "basicsFooter",
      categoryType: "full",
    });

    if (
      (this.state.descriptionEditValue !== null &&
        this.state.descriptionEditValue !== undefined) ||
      this.props.threadInfo.description ||
      canEditThread
    ) {
      listData.push({
        itemType: "description",
        key: "description",
        threadInfo: this.props.threadInfo,
        descriptionEditValue: this.state.descriptionEditValue,
        descriptionTextHeight: this.state.descriptionTextHeight,
        canChangeSettings,
      });
    }

    listData.push({
      itemType: "header",
      key: "subscriptionHeader",
      title: "Subscription",
      categoryType: "full",
    });
    listData.push({
      itemType: "pushNotifs",
      key: "pushNotifs",
      threadInfo: this.props.threadInfo,
    });
    listData.push({
      itemType: "footer",
      key: "subscriptionFooter",
      categoryType: "full",
    });

    listData.push({
      itemType: "header",
      key: "privacyHeader",
      title: "Privacy",
      categoryType: "full",
    });
    listData.push({
      itemType: "parent",
      key: "parent",
      threadInfo: this.props.threadInfo,
      navigate: this.props.navigation.navigate,
    });
    listData.push({
      itemType: "visibility",
      key: "visibility",
      threadInfo: this.props.threadInfo,
    });
    listData.push({
      itemType: "footer",
      key: "privacyFooter",
      categoryType: "full",
    });

    let childThreads = null;
    if (this.props.childThreadInfos) {
      let childThreadInfos;
      let seeMoreChildThreads = null;
      if (this.props.childThreadInfos.length > this.state.showMaxChildThreads) {
        childThreadInfos =
          this.props.childThreadInfos.slice(0, this.state.showMaxChildThreads);
        seeMoreChildThreads = {
          itemType: "seeMore",
          key: "seeMoreChildThreads",
          onPress: this.onPressSeeMoreChildThreads,
        };
      } else {
        childThreadInfos = this.props.childThreadInfos;
      }
      childThreads = childThreadInfos.map(threadInfo => ({
        itemType: "childThread",
        key: `childThread${threadInfo.id}`,
        threadInfo,
        navigate: this.props.navigation.navigate,
      }));
      if (seeMoreChildThreads) {
        childThreads.push(seeMoreChildThreads);
      }
    }

    let addChildThread = null;
    const canCreateSubthreads = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.CREATE_SUBTHREADS,
    );
    if (canCreateSubthreads) {
      addChildThread = {
        itemType: "addChildThread",
        key: "addChildThread",
        threadInfo: this.props.threadInfo,
        navigate: this.props.navigation.navigate,
      };
    }

    if (addChildThread || childThreads) {
      listData.push({
        itemType: "header",
        key: "childThreadHeader",
        title: "Child threads",
        categoryType: "unpadded",
      });
    }
    if (addChildThread) {
      listData.push(addChildThread);
    }
    if (childThreads) {
      listData = [...listData, ...childThreads];
    }
    if (addChildThread || childThreads) {
      listData.push({
        itemType: "footer",
        key: "childThreadFooter",
        categoryType: "unpadded",
      });
    }

    let threadMembers;
    let seeMoreMembers = null;
    if (this.props.threadMembers.length > this.state.showMaxMembers) {
      threadMembers =
        this.props.threadMembers.slice(0, this.state.showMaxMembers);
      seeMoreMembers = {
        itemType: "seeMore",
        key: "seeMoreMembers",
        onPress: this.onPressSeeMoreMembers,
      };
    } else {
      threadMembers = this.props.threadMembers;
    }
    const members = threadMembers.map(memberInfo => ({
      itemType: "member",
      key: `member${memberInfo.id}`,
      memberInfo,
      threadInfo: this.props.threadInfo,
      canEdit: canStartEditing,
    }));
    if (seeMoreMembers) {
      members.push(seeMoreMembers);
    }

    let addMembers = null;
    const canAddMembers = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.ADD_MEMBERS,
    );
    if (canAddMembers) {
      addMembers = {
        itemType: "addMember",
        key: "addMember",
      };
    }

    if (addMembers || members) {
      listData.push({
        itemType: "header",
        key: "memberHeader",
        title: "Members",
        categoryType: "unpadded",
      });
    }
    if (addMembers) {
      listData.push(addMembers);
    }
    if (members) {
      listData = [...listData, ...members];
    }
    if (addMembers || members) {
      listData.push({
        itemType: "footer",
        key: "memberFooter",
        categoryType: "unpadded",
      });
    }

    if (viewerIsMember(this.props.threadInfo)) {
      listData.push({
        itemType: "leaveThread",
        key: "leaveThread",
        threadInfo: this.props.threadInfo,
      });
    }

    return (
      <View>
        <FlatList
          data={listData}
          contentContainerStyle={styles.flatList}
          renderItem={this.renderItem}
        />
        <Modal
          isVisible={this.state.showAddUsersModal}
          onBackButtonPress={this.closeAddUsersModal}
          onBackdropPress={this.closeAddUsersModal}
        >
          <AddUsersModal
            threadInfo={this.props.threadInfo}
            close={this.closeAddUsersModal}
          />
        </Modal>
      </View>
    );
  }

  renderItem = (row: { item: ChatSettingsItem }) => {
    const item = row.item;
    if (item.itemType === "header") {
      return (
        <ThreadSettingsCategoryHeader
          type={item.categoryType}
          title={item.title}
        />
      );
    } else if (item.itemType === "footer") {
      return <ThreadSettingsCategoryFooter type={item.categoryType} />;
    } else if (item.itemType === "name") {
      return (
        <ThreadSettingsName
          threadInfo={item.threadInfo}
          nameEditValue={item.nameEditValue}
          setNameEditValue={this.setNameEditValue}
          nameTextHeight={item.nameTextHeight}
          setNameTextHeight={this.setNameTextHeight}
          canChangeSettings={item.canChangeSettings}
        />
      );
    } else if (item.itemType === "color") {
      return (
        <ThreadSettingsColor
          threadInfo={item.threadInfo}
          colorEditValue={item.colorEditValue}
          setColorEditValue={this.setColorEditValue}
          showEditColorModal={item.showEditColorModal}
          setEditColorModalVisibility={this.setEditColorModalVisibility}
          canChangeSettings={item.canChangeSettings}
        />
      );
    } else if (item.itemType === "description") {
      return (
        <ThreadSettingsDescription
          threadInfo={item.threadInfo}
          descriptionEditValue={item.descriptionEditValue}
          setDescriptionEditValue={this.setDescriptionEditValue}
          descriptionTextHeight={item.descriptionTextHeight}
          setDescriptionTextHeight={this.setDescriptionTextHeight}
          canChangeSettings={item.canChangeSettings}
        />
      );
    } else if (item.itemType === "parent") {
      return (
        <ThreadSettingsParent
          threadInfo={item.threadInfo}
          navigate={item.navigate}
        />
      );
    } else if (item.itemType === "visibility") {
      return <ThreadSettingsVisibility threadInfo={item.threadInfo} />;
    } else if (item.itemType === "pushNotifs") {
      return <ThreadSettingsPushNotifs threadInfo={item.threadInfo} />;
    } else if (item.itemType === "seeMore") {
      return <ThreadSettingsSeeMore onPress={item.onPress} />;
    } else if (item.itemType === "childThread") {
      return (
        <ThreadSettingsChildThread
          threadInfo={item.threadInfo}
          navigate={item.navigate}
        />
      );
    } else if (item.itemType === "addChildThread") {
      return (
        <ThreadSettingsAddChildThread
          threadInfo={item.threadInfo}
          navigate={item.navigate}
        />
      );
    } else if (item.itemType === "member") {
      return (
        <ThreadSettingsMember
          memberInfo={item.memberInfo}
          threadInfo={item.threadInfo}
          canEdit={item.canEdit}
        />
      );
    } else if (item.itemType === "addMember") {
      return <ThreadSettingsAddMember onPress={this.onPressAddMember} />;
    } else if (item.itemType === "leaveThread") {
      return <ThreadSettingsLeaveThread threadInfo={item.threadInfo} />;
    }
  }

  setNameEditValue = (value: ?string, callback?: () => void) => {
    this.setState({ nameEditValue: value }, callback);
  }

  setNameTextHeight = (height: number) => {
    this.setState({ nameTextHeight: height });
  }

  setEditColorModalVisibility = (visible: bool) => {
    this.setState({ showEditColorModal: visible });
  }

  setColorEditValue = (color: string) => {
    this.setState({ showEditColorModal: false, colorEditValue: color });
  }

  setDescriptionEditValue = (value: ?string, callback?: () => void) => {
    this.setState({ descriptionEditValue: value }, callback);
  }

  setDescriptionTextHeight = (height: number) => {
    this.setState({ descriptionTextHeight: height });
  }

  onPressAddMember = () => {
    this.setState({ showAddUsersModal: true });
  }

  closeAddUsersModal = () => {
    this.setState({ showAddUsersModal: false });
  }

  onPressSeeMoreMembers = () => {
    this.setState(prevState => ({
      showMaxMembers: prevState.showMaxMembers + itemPageLength,
    }));
  }

  onPressSeeMoreChildThreads = () => {
    this.setState(prevState => ({
      showMaxChildThreads: prevState.showMaxChildThreads + itemPageLength,
    }));
  }

}

const styles = StyleSheet.create({
  flatList: {
    paddingVertical: 16,
  },
});

const editNameLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:name`,
);
const editColorLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);
const editDescriptionLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);
const leaveThreadLoadingStatusSelector
  = createLoadingStatusSelector(leaveThreadActionTypes);

const somethingIsSaving = (
  state: AppState,
  threadMembers: RelativeMemberInfo[],
) => {
  if (
    editNameLoadingStatusSelector(state) === "loading" ||
    editColorLoadingStatusSelector(state) === "loading" ||
    editDescriptionLoadingStatusSelector(state) === "loading" ||
    leaveThreadLoadingStatusSelector(state) === "loading"
  ) {
    return true;
  }
  for (let threadMember of threadMembers) {
    const removeUserLoadingStatus = createLoadingStatusSelector(
      removeUsersFromThreadActionTypes,
      `${removeUsersFromThreadActionTypes.started}:${threadMember.id}`,
    )(state);
    if (removeUserLoadingStatus === "loading") {
      return true;
    }
    const changeRoleLoadingStatus = createLoadingStatusSelector(
      changeThreadMemberRolesActionTypes,
      `${changeThreadMemberRolesActionTypes.started}:${threadMember.id}`,
    )(state);
    if (changeRoleLoadingStatus === "loading") {
      return true;
    }
  }
  return false;
};

const ThreadSettingsRouteName = 'ThreadSettings';
const ThreadSettings = connect(
  (state: AppState, ownProps: { navigation: NavProp }): * => {
    const parsedThreadInfos = threadInfoSelector(state);
    const passedThreadInfo = ownProps.navigation.state.params.threadInfo;
    // We pull the version from Redux so we get updates once they go through
    const threadInfo = parsedThreadInfos[passedThreadInfo.id];
    const threadMembers =
      relativeMemberInfoSelectorForMembersOfThread(threadInfo.id)(state);
    return {
      threadInfo,
      threadMembers,
      childThreadInfos: childThreadInfos(state)[threadInfo.id],
      somethingIsSaving: somethingIsSaving(state, threadMembers),
    };
  },
)(InnerThreadSettings);

export {
  ThreadSettings,
  ThreadSettingsRouteName,
};
