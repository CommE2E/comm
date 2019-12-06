// @flow

import {
  type ThreadInfo,
  type RelativeMemberInfo,
  threadInfoPropType,
  threadPermissions,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
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
} from '../../keyboard/keyboard-state';
import {
  type Navigate,
  ThreadSettingsMemberTooltipModalRouteName,
} from '../../navigation/route-names';
import { type Colors, colorsPropType } from '../../themes/colors';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { threadHasPermission, memberIsAdmin } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from '../../components/edit-setting-button.react';
import Button from '../../components/button.react';
import PencilIcon from './pencil-icon.react';
import { colorsSelector, styleSelector } from '../../themes/colors';

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
  colors: Colors,
  styles: Styles,
  // withOverlayableScrollViewState
  overlayableScrollViewState: ?OverlayableScrollViewState,
  // withKeyboardState
  keyboardState: ?KeyboardState,
|};
class ThreadSettingsMember extends React.PureComponent<Props> {

  static propTypes = {
    memberInfo: relativeMemberInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    canEdit: PropTypes.bool.isRequired,
    navigate: PropTypes.func.isRequired,
    lastListItem: PropTypes.bool.isRequired,
    verticalBounds: verticalBoundsPropType,
    removeUserLoadingStatus: loadingStatusPropType.isRequired,
    changeRoleLoadingStatus: loadingStatusPropType.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    overlayableScrollViewState: overlayableScrollViewStatePropType,
    keyboardState: keyboardStatePropType,
  };
  editButton: ?View;

  visibleEntryIDs() {
    const role = this.props.memberInfo.role;
    if (!this.props.canEdit || !role) {
      return [];
    }

    const canRemoveMembers = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.REMOVE_MEMBERS,
    );
    const canChangeRoles = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.CHANGE_ROLE,
    );

    const result = [];
    if (
      canRemoveMembers &&
      !this.props.memberInfo.isViewer &&
      (
        canChangeRoles ||
        (
          this.props.threadInfo.roles[role] &&
          this.props.threadInfo.roles[role].isDefault
        )
      )
    ) {
      result.push("remove_user");
    }

    if (canChangeRoles && this.props.memberInfo.username) {
      result.push(
        memberIsAdmin(this.props.memberInfo, this.props.threadInfo)
          ? "remove_admin"
          : "make_admin"
      );
    }

    return result;
  }

  render() {
    const userText = stringForUser(this.props.memberInfo);
    let userInfo = null;
    if (this.props.memberInfo.username) {
      userInfo = (
        <Text style={this.props.styles.username} numberOfLines={1}>
          {userText}
        </Text>
      );
    } else {
      userInfo = (
        <Text style={[
          this.props.styles.username,
          this.props.styles.anonymous,
        ]} numberOfLines={1}>
          {userText}
        </Text>
      );
    }

    let editButton = null;
    if (
      this.props.removeUserLoadingStatus === "loading" ||
      this.props.changeRoleLoadingStatus === "loading"
    ) {
      editButton = (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else if (this.visibleEntryIDs().length !== 0) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressEdit}
          style={this.props.styles.editButton}
        >
          <View onLayout={this.onEditButtonLayout} ref={this.editButtonRef}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    }

    let roleInfo = null;
    if (memberIsAdmin(this.props.memberInfo, this.props.threadInfo)) {
      roleInfo = (
        <View style={this.props.styles.row}>
          <Text style={this.props.styles.role}>admin</Text>
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
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.role}>parent admin</Text>
          </View>
        );
      }
    }

    const lastInnerContainer = this.props.lastListItem
      ? this.props.styles.lastInnerContainer
      : null;
    return (
      <View style={this.props.styles.container}>
        <View style={[ this.props.styles.innerContainer, lastInnerContainer ]}>
          <View style={this.props.styles.row}>
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
          visibleEntryIDs: this.visibleEntryIDs(),
          memberInfo: this.props.memberInfo,
          threadInfo: this.props.threadInfo,
        },
      });
    });
  }

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  }

}

const styles = {
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'panelForeground',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: 'panelForegroundBorder',
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
    color: 'panelForegroundSecondaryLabel',
  },
  anonymous: {
    fontStyle: 'italic',
    color: 'panelForegroundTertiaryLabel',
  },
  role: {
    flex: 1,
    fontSize: 14,
    color: 'panelForegroundTertiaryLabel',
    paddingTop: 4,
  },
  lastInnerContainer: {
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  },
  editButton: {
    paddingLeft: 10,
  },
};
const stylesSelector = styleSelector(styles);

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
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
)(withKeyboardState(withOverlayableScrollViewState(ThreadSettingsMember)));
