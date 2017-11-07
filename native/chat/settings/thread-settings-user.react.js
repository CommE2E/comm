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
class ThreadSettingsUser extends React.PureComponent<Props> {

  static propTypes = {
    memberInfo: relativeMemberInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    canEdit: PropTypes.bool.isRequired,
  };
  popoverConfig: $ReadOnlyArray<{ label: string, onPress: () => void }>;

  constructor(props: Props) {
    super(props);
    this.popoverConfig = [
      { label: "Remove user", onPress: this.onPressRemoveUser },
      { label: "Make admin", onPress: this.onPressMakeAdmin },
    ];
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

    const canEditThread = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_THREAD,
    );
    const canChange = !this.props.memberInfo.isViewer && canEditThread;
    let editButton = null;
    if (canChange && this.props.canEdit) {
      editButton = (
        <PopoverTooltip
          buttonComponent={icon}
          items={this.popoverConfig}
          labelStyle={styles.popoverLabelStyle}
        />
      );
    }

    let roleInfo = null;
    const role = this.props.memberInfo.role &&
      this.props.threadInfo.roles[this.props.memberInfo.role];
    if (role && role.name === "Admins") {
      roleInfo = (
        <View style={styles.row}>
          <Text style={styles.role}>admin</Text>
        </View>
      );
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
