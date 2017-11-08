// @flow

import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import {
  threadInfoPropType,
  threadPermissions,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import _isEqual from 'lodash/fp/isEqual';

import { threadHasPermission } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';

import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';
import PopoverTooltip from '../../components/popover-tooltip.react';

type Props = {|
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
  canEdit: bool,
|};
type State = {|
  popoverConfig: $ReadOnlyArray<{ label: string, onPress: () => void }>,
|};
class ThreadSettingsUser extends React.PureComponent<Props, State> {

  static propTypes = {
    memberInfo: relativeMemberInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    canEdit: PropTypes.bool.isRequired,
  };

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
      result.push({ label: "Remove user", onPress: this.onPressRemoveUser });
    }

    if (canChangeRoles && this.props.memberInfo.username) {
      const adminText = ThreadSettingsUser.memberIsAdmin(props)
        ? "Remove admin"
        : "Make admin";
      result.push({ label: adminText, onPress: this.onPressMakeAdmin });
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
    if (this.state.popoverConfig.length !== 0) {
      editButton = (
        <PopoverTooltip
          buttonComponent={icon}
          items={this.state.popoverConfig}
          labelStyle={styles.popoverLabelStyle}
        />
      );
    }

    let roleInfo = null;
    if (ThreadSettingsUser.memberIsAdmin(this.props)) {
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

    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {userInfo}
          {editButton}
        </View>
        {roleInfo}
      </View>
    );
  }

  onPressRemoveUser = () => {
  }

  onPressMakeAdmin = () => {
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
  },
  anonymous: {
    fontStyle: 'italic',
    color: "#888888",
  },
  editIcon: {
    lineHeight: 20,
    paddingLeft: 10,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
  popoverLabelStyle: {
    textAlign: 'center',
    color: '#444',
  },
  role: {
    flex: 1,
    fontSize: 14,
    color: "#888888",
    paddingTop: 4,
  },
});

const icon = (
  <Icon
    name="pencil"
    size={16}
    style={styles.editIcon}
    color="#036AFF"
  />
);

export default ThreadSettingsUser;
