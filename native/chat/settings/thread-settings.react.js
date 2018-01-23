// @flow

import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';
import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import {
  threadInfoPropType,
  threadPermissions,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import ThreadSettingsUser from './thread-settings-user.react';
import {
  ThreadSettingsSeeMore,
  ThreadSettingsAddUser,
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
import ThreadSettingsLeaveThread from './thread-settings-leave-thread.react';

const itemPageLength = 5;

type NavProp = NavigationScreenProp<NavigationRoute>
  & { state: { params: { threadInfo: ThreadInfo } } };

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

    let description = null;
    if (
      (this.state.descriptionEditValue !== null &&
        this.state.descriptionEditValue !== undefined) ||
      this.props.threadInfo.description ||
      canEditThread
    ) {
      description = (
        <ThreadSettingsDescription
          threadInfo={this.props.threadInfo}
          descriptionEditValue={this.state.descriptionEditValue}
          setDescriptionEditValue={this.setDescriptionEditValue}
          descriptionTextHeight={this.state.descriptionTextHeight}
          setDescriptionTextHeight={this.setDescriptionTextHeight}
          canChangeSettings={canChangeSettings}
        />
      );
    }

    let threadMembers;
    let seeMoreMembers = null;
    if (this.props.threadMembers.length > this.state.showMaxMembers) {
      threadMembers =
        this.props.threadMembers.slice(0, this.state.showMaxMembers);
      seeMoreMembers = (
        <ThreadSettingsSeeMore
          onPress={this.onPressSeeMoreMembers}
          key="seeMore"
        />
      );
    } else {
      threadMembers = this.props.threadMembers;
    }
    const members = threadMembers.map(memberInfo => {
      return (
        <ThreadSettingsUser
          memberInfo={memberInfo}
          threadInfo={this.props.threadInfo}
          canEdit={canStartEditing}
          key={memberInfo.id}
        />
      );
    });
    if (seeMoreMembers) {
      members.push(seeMoreMembers);
    }

    let addMembers = null;
    const canAddMembers = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.ADD_MEMBERS,
    );
    if (canAddMembers) {
      addMembers = <ThreadSettingsAddUser onPress={this.onPressAddUser} />;
    }

    let membersPanel = null;
    if (addMembers || members) {
      membersPanel = (
        <View>
          <ThreadSettingsCategoryHeader type="unpadded" title="Members" />
          {addMembers}
          {members}
          <ThreadSettingsCategoryFooter type="unpadded" />
        </View>
      );
    }

    let childThreads = null;
    if (this.props.childThreadInfos) {
      let childThreadInfos;
      let seeMoreChildThreads = null;
      if (this.props.childThreadInfos.length > this.state.showMaxChildThreads) {
        childThreadInfos =
          this.props.childThreadInfos.slice(0, this.state.showMaxChildThreads);
        seeMoreChildThreads = (
          <ThreadSettingsSeeMore
            onPress={this.onPressSeeMoreChildThreads}
            key="seeMore"
          />
        );
      } else {
        childThreadInfos = this.props.childThreadInfos;
      }
      childThreads = childThreadInfos.map(threadInfo => {
        return (
          <ThreadSettingsChildThread
            threadInfo={threadInfo}
            navigate={this.props.navigation.navigate}
            key={threadInfo.id}
          />
        );
      });
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
      addChildThread = (
        <ThreadSettingsAddChildThread
          threadInfo={this.props.threadInfo}
          navigate={this.props.navigation.navigate}
        />
      );
    }

    let childThreadPanel = null;
    if (addChildThread || childThreads) {
      childThreadPanel = (
        <View>
          <ThreadSettingsCategoryHeader type="unpadded" title="Child threads" />
          {addChildThread}
          {childThreads}
          <ThreadSettingsCategoryFooter type="unpadded" />
        </View>
      );
    }

    let leaveThreadButton = null;
    if (viewerIsMember(this.props.threadInfo)) {
      leaveThreadButton = (
        <ThreadSettingsLeaveThread
          threadInfo={this.props.threadInfo}
          threadMembers={this.props.threadMembers}
        />
      );
    }

    return (
      <View>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <ThreadSettingsCategoryHeader type="full" title="Basics" />
          <ThreadSettingsName
            threadInfo={this.props.threadInfo}
            nameEditValue={this.state.nameEditValue}
            setNameEditValue={this.setNameEditValue}
            nameTextHeight={this.state.nameTextHeight}
            setNameTextHeight={this.setNameTextHeight}
            canChangeSettings={canChangeSettings}
          />
          <ThreadSettingsColor
            threadInfo={this.props.threadInfo}
            colorEditValue={this.state.colorEditValue}
            setColorEditValue={this.setColorEditValue}
            showEditColorModal={this.state.showEditColorModal}
            setEditColorModalVisibility={this.setEditColorModalVisibility}
            canChangeSettings={canChangeSettings}
          />
          <ThreadSettingsCategoryFooter type="full" />
          {description}
          <ThreadSettingsCategoryHeader type="full" title="Privacy" />
          <ThreadSettingsParent
            threadInfo={this.props.threadInfo}
            navigate={this.props.navigation.navigate}
          />
          <ThreadSettingsVisibility threadInfo={this.props.threadInfo} />
          <ThreadSettingsCategoryFooter type="full" />
          {childThreadPanel}
          {membersPanel}
          {leaveThreadButton}
        </ScrollView>
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

  onPressAddUser = () => {
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
  scrollView: {
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
