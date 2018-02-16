// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';

import { visibilityRules } from 'lib/types/thread-types';

import ThreadVisibility from '../../components/thread-visibility.react';

type Props = {|
  threadInfo: ThreadInfo,
|};
class ThreadSettingsVisibility extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
  };

  render() {
    const visRules = this.props.threadInfo.visibilityRules;
    return (
      <View style={styles.row}>
        <Text style={styles.label}>Visibility</Text>
        <ThreadVisibility visibilityRules={visRules} color="#333333" />
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
});

export default ThreadSettingsVisibility;
