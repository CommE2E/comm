// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadPermissions } from 'lib/types/thread-types';

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { threadHasPermission } from 'lib/shared/thread-utils';

import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';
import PopoverTooltip from '../../components/popover-tooltip.react';

type Props = {|
  userInfo: {|
    id: string,
    username: string,
    isViewer: bool,
  |},
  threadInfo: ThreadInfo,
  canEdit: bool,
|};
class ThreadSettingsUser extends React.PureComponent<Props> {

  popoverConfig: $ReadOnlyArray<{ label: string, onPress: () => void }>;

  constructor(props: Props) {
    super(props);
    this.popoverConfig = [
      { label: "Remove user", onPress: this.onPressRemoveUser },
      { label: "Make admin", onPress: this.onPressMakeAdmin },
    ];
  }

  render() {
    const canEditThread = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_THREAD,
    );
    const canChange = !this.props.userInfo.isViewer && canEditThread;
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
    return (
      <View style={styles.container}>
        <Text style={styles.username} numberOfLines={1}>
          {this.props.userInfo.username}
        </Text>
        {editButton}
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
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
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
