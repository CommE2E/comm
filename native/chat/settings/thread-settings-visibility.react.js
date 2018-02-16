// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';

import { visibilityRules } from 'lib/types/thread-types';

type Props = {|
  threadInfo: ThreadInfo,
|};
class ThreadSettingsVisibility extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
  };

  render() {
    const visRules = this.props.threadInfo.visibilityRules;
    const visibility =
      visRules === visibilityRules.OPEN ||
      visRules === visibilityRules.CHAT_NESTED_OPEN
        ? "Open"
        : "Secret";
    return (
      <View style={styles.row}>
        <Text style={styles.label}>Visibility</Text>
        <Text style={styles.currentValue}>
          {visibility}
        </Text>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    backgroundColor: "white",
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingRight: 0,
    paddingTop: Platform.OS === "ios" ? 1 : 0,
    margin: 0,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
  },
});

export default ThreadSettingsVisibility;
