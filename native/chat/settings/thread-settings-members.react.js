// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';

type ThreadSettingsUserProps = {
  userInfo: {|
    id: string,
    username: string,
    isViewer: bool,
  |},
  threadInfo: ThreadInfo,
};
function ThreadSettingsUser(props: ThreadSettingsUserProps) {
  const canChange = !props.userInfo.isViewer &&
    props.threadInfo.canChangeSettings;
  return (
    <View style={styles.container}>
      <Text style={styles.username}>{props.userInfo.username}</Text>
      <EditSettingButton
        onPress={() => {}}
        canChangeSettings={canChange}
        style={styles.editSettingsIcon}
      />
    </View>
  );
}

type ThreadSettingsAddUserProps = {
  onPress: () => void,
};
function ThreadSettingsAddUser(props: ThreadSettingsAddUserProps) {
  return (
    <Button
      onPress={props.onPress}
    >
      <View style={[styles.container, styles.addUser]}>
        <Text style={styles.addUserText}>Add users</Text>
        <Icon
          name={"md-add"}
          size={20}
          style={styles.addIcon}
          color="#009900"
        />
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    justifyContent: 'center',
  },
  addUser: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  editSettingsIcon: {
    lineHeight: 20,
  },
  addIcon: {
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
  },
  addUserText: {
    flex: 1,
    fontSize: 16,
    color: "#036AFF",
    fontStyle: 'italic',
  },
});

export {
  ThreadSettingsUser,
  ThreadSettingsAddUser,
};
