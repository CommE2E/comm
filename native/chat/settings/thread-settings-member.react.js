// @flow

import {
  type ThreadInfo,
  type RelativeMemberInfo,
  threadInfoPropType,
  threadPermissions,
  relativeMemberInfoPropType,
  type ChangeThreadSettingsResult,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  type OverlayableScrollViewState,
  overlayableScrollViewStatePropType,
  withOverlayableScrollViewState,
} from '../../navigation/overlayable-scroll-view-state';
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../../types/lightbox-types';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../../navigation/keyboard-state';
import {
  type Navigate,
  ThreadSettingsMemberTooltipModalRouteName,
} from '../../navigation/route-names';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import _isEqual from 'lodash/fp/isEqual';
import invariant from 'invariant';

import { threadHasPermission } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  removeUsersFromThreadActionTypes,
  removeUsersFromThread,
  changeThreadMemberRolesActionTypes,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from '../../components/edit-setting-button.react';
import Button from '../../components/button.react';
import Tooltip from '../../components/tooltip.react';
import PencilIcon from './pencil-icon.react';

type Props = {|
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
  canEdit: bool,
  navigate: Navigate,
  lastListItem: bool,
  verticalBounds: ?VerticalBounds,
  // Redux state
  removeUserLoadingStatus: LoadingStatus,
  changeRoleLoadingStatus: LoadingStatus,
  // withOverlayableScrollViewState
  overlayableScrollViewState: ?OverlayableScrollViewState,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  removeUsersFromThread: (
    threadID: string,
    userIDs: string[],
  ) => Promise<ChangeThreadSettingsResult>,
  changeThreadMemberRoles: (
    threadID: string,
    userIDs: string[],
    newRole: string,
  ) => Promise<ChangeThreadSettingsResult>,
|};
type State = {|
  popoverConfig: $ReadOnlyArray<{ label: string, onPress: () => void }>,
|};
class ThreadSettingsMember extends React.PureComponent<Props, State> {

  static propTypes = {
    memberInfo: relativeMemberInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    canEdit: PropTypes.bool.isRequired,
    navigate: PropTypes.func.isRequired,
    lastListItem: PropTypes.bool.isRequired,
    verticalBounds: verticalBoundsPropType,
    removeUserLoadingStatus: loadingStatusPropType.isRequired,
    changeRoleLoadingStatus: loadingStatusPropType.isRequired,
    overlayableScrollViewState: overlayableScrollViewStatePropType,
    keyboardState: keyboardStatePropType,
    dispatchActionPromise: PropTypes.func.isRequired,
    removeUsersFromThread: PropTypes.func.isRequired,
    changeThreadMemberRoles: PropTypes.func.isRequired,
  };
  editButton: ?View;

  static memberIsAdmin(props: Props) {
    const role = props.memberInfo.role &&
      props.threadInfo.roles[props.memberInfo.role];
    return role && !role.isDefault && role.name === "Admins";
  }

  generatePopoverConfig(props: Props) {
    const role = props.memberInfo.role;
    if (!props.canEdit || !role) {
      return [];
    }

    const canRemoveMembers = threadHasPermission(
      props.threadInfo,
      threadPermissions.REMOVE_MEMBERS,
    );
    const canChangeRoles = threadHasPermission(
      props.threadInfo,
      threadPermissions.CHANGE_ROLE,
    );

    const result = [];
    if (
      canRemoveMembers &&
      !props.memberInfo.isViewer &&
      (
        canChangeRoles ||
        (
          props.threadInfo.roles[role] &&
          props.threadInfo.roles[role].isDefault
        )
      )
    ) {
      result.push({ label: "Remove user", onPress: this.showRemoveUserConfirmation });
    }

    if (canChangeRoles && props.memberInfo.username) {
      const adminText = ThreadSettingsMember.memberIsAdmin(props)
        ? "Remove admin"
        : "Make admin";
      result.push({ label: adminText, onPress: this.showMakeAdminConfirmation });
    }

    return result;
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      popoverConfig: this.generatePopoverConfig(props),
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    const nextPopoverConfig = this.generatePopoverConfig(nextProps);
    if (!_isEqual(this.state.popoverConfig)(nextPopoverConfig)) {
      this.setState({ popoverConfig: nextPopoverConfig });
    }
  }

  render() {
    const userText = stringForUser(this.props.memberInfo);
    let userInfo = null;
    if (this.props.memberInfo.username) {
      userInfo = (
        <Text style={styles.username} numberOfLines={1}>{userText}</Text>
      );
    } else {
      userInfo = (
        <Text style={[styles.username, styles.anonymous]} numberOfLines={1}>
          {userText}
        </Text>
      );
    }

    let editButton = null;
    if (
      this.props.removeUserLoadingStatus === "loading" ||
      this.props.changeRoleLoadingStatus === "loading"
    ) {
      editButton = <ActivityIndicator size="small" />;
    } else if (this.state.popoverConfig.length !== 0) {
      editButton = (
        <TouchableOpacity onPress={this.onPressEdit} style={styles.editButton}>
          <View onLayout={this.onEditButtonLayout} ref={this.editButtonRef}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    }

    let roleInfo = null;
    if (ThreadSettingsMember.memberIsAdmin(this.props)) {
      roleInfo = (
        <View style={styles.row}>
          <Text style={styles.role}>admin</Text>
        </View>
      );
    } else {
      // In the future, when we might have more than two roles per threads, we
      // will need something more sophisticated here. For now, if the user isn't
      // an admin and yet has the CHANGE_ROLE permissions, we know that they are
      // an admin of an ancestor of this thread.
      const canChangeRoles =
        this.props.memberInfo.permissions[threadPermissions.CHANGE_ROLE] &&
        this.props.memberInfo.permissions[threadPermissions.CHANGE_ROLE].value;
      if (canChangeRoles) {
        roleInfo = (
          <View style={styles.row}>
            <Text style={styles.role}>parent admin</Text>
          </View>
        );
      }
    }

    const lastInnerContainer = this.props.lastListItem
      ? styles.lastInnerContainer
      : null;
    return (
      <View style={styles.container}>
        <View style={[styles.innerContainer, lastInnerContainer]}>
          <View style={styles.row}>
            {userInfo}
            {editButton}
          </View>
          {roleInfo}
        </View>
      </View>
    );
  }

  editButtonRef = (editButton: ?View) => {
    this.editButton = editButton;
  }

  onEditButtonLayout = () => {}

  onPressEdit = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const { editButton, props: { verticalBounds } } = this;
    if (!editButton || !verticalBounds) {
      return;
    }

    const { overlayableScrollViewState } = this.props;
    if (overlayableScrollViewState) {
      overlayableScrollViewState.setScrollDisabled(true);
    }

    editButton.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigate({
        routeName: ThreadSettingsMemberTooltipModalRouteName,
        params: {
          initialCoordinates: coordinates,
          verticalBounds,
        },
      });
    });
  }

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  }

  showRemoveUserConfirmation = () => {
    const userText = stringForUser(this.props.memberInfo);
    Alert.alert(
      "Confirm removal",
      `Are you sure you want to remove ${userText} from this thread?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: this.onConfirmRemoveUser },
      ],
    );
  }

  onConfirmRemoveUser = () => {
    const customKeyName = removeUsersFromThreadActionTypes.started +
      `:${this.props.memberInfo.id}`;
    this.props.dispatchActionPromise(
      removeUsersFromThreadActionTypes,
      this.removeUser(),
      { customKeyName },
    );
  }

  async removeUser() {
    return await this.props.removeUsersFromThread(
      this.props.threadInfo.id,
      [ this.props.memberInfo.id ],
    );
  }

  showMakeAdminConfirmation = () => {
    const userText = stringForUser(this.props.memberInfo);
    const actionClause = ThreadSettingsMember.memberIsAdmin(this.props)
      ? `remove ${userText} as an admin`
      : `make ${userText} an admin`;
    Alert.alert(
      "Confirm action",
      `Are you sure you want to ${actionClause} of this thread?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: this.onConfirmMakeAdmin },
      ],
    );
  }

  onConfirmMakeAdmin = () => {
    const isCurrentlyAdmin = ThreadSettingsMember.memberIsAdmin(this.props);
    let newRole = null;
    for (let roleID in this.props.threadInfo.roles) {
      const role = this.props.threadInfo.roles[roleID];
      if (isCurrentlyAdmin && role.isDefault) {
        newRole = role.id;
        break;
      } else if (!isCurrentlyAdmin && role.name === "Admins") {
        newRole = role.id;
        break;
      }
    }
    invariant(newRole !== null, "Could not find new role");
    const customKeyName = changeThreadMemberRolesActionTypes.started +
      `:${this.props.memberInfo.id}`;
    this.props.dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      this.makeAdmin(newRole),
      { customKeyName },
    );
  }

  async makeAdmin(newRole: string) {
    return await this.props.changeThreadMemberRoles(
      this.props.threadInfo.id,
      [ this.props.memberInfo.id ],
      newRole,
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  username: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: "#333333",
  },
  anonymous: {
    fontStyle: 'italic',
    color: "#888888",
  },
  role: {
    flex: 1,
    fontSize: 14,
    color: "#888888",
    paddingTop: 4,
  },
  lastInnerContainer: {
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  },
  editButton: {
    paddingLeft: 10,
  },
});

export default connect(
  (state: AppState, ownProps: { memberInfo: RelativeMemberInfo }) => ({
    removeUserLoadingStatus: createLoadingStatusSelector(
      removeUsersFromThreadActionTypes,
      `${removeUsersFromThreadActionTypes.started}:${ownProps.memberInfo.id}`,
    )(state),
    changeRoleLoadingStatus: createLoadingStatusSelector(
      changeThreadMemberRolesActionTypes,
      `${changeThreadMemberRolesActionTypes.started}:${ownProps.memberInfo.id}`,
    )(state),
  }),
  { removeUsersFromThread, changeThreadMemberRoles },
)(withKeyboardState(withOverlayableScrollViewState(ThreadSettingsMember)));
