// @flow

import { threadTypes, type ThreadType } from 'lib/types/thread-types';
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = {|
  +threadType: ThreadType,
  +color: string,
|};
function ThreadVisibility(props: Props) {
  const { threadType, color } = props;
  const visLabelStyle = [styles.visibilityLabel, { color }];
  if (threadType === threadTypes.CHAT_SECRET) {
    return (
      <View style={styles.container}>
        <Icon name="lock-outline" size={18} color={color} />
        <Text style={visLabelStyle}>Secret</Text>
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <Icon name="public" size={18} color={color} />
        <Text style={visLabelStyle}>Open</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingLeft: 4,
  },
});

export default ThreadVisibility;
