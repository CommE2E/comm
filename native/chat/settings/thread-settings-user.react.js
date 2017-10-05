// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';

type Props = {|
  userInfo: {|
    id: string,
    username: string,
    isViewer: bool,
  |},
  threadInfo: ThreadInfo,
  canEdit: bool,
|};
function ThreadSettingsUser(props: Props) {
  const canChange = !props.userInfo.isViewer &&
    props.threadInfo.canChangeSettings;
  let editButton = null;
  if (props.canEdit) {
    editButton = (
      <EditSettingButton
        onPress={() => {}}
        canChangeSettings={canChange}
        style={styles.editSettingsIcon}
      />
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.username} numberOfLines={1}>
        {props.userInfo.username}
      </Text>
      {editButton}
    </View>
  );
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
  editSettingsIcon: {
    lineHeight: 20,
  },
});

export default ThreadSettingsUser;
