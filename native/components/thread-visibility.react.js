// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { threadTypes, type ThreadType } from 'lib/types/thread-types';

import ThreadIcon from './thread-icon.react';

type Props = {|
  +threadType: ThreadType,
  +color: string,
|};
function ThreadVisibility(props: Props) {
  const { threadType, color } = props;
  const visLabelStyle = [styles.visibilityLabel, { color }];

  let label;
  if (threadType === threadTypes.CHAT_SECRET) {
    label = 'Secret';
  } else if (threadType === threadTypes.PRIVATE) {
    label = 'Private';
  } else {
    label = 'Open';
  }

  return (
    <View style={styles.container}>
      <ThreadIcon threadType={threadType} color={color} />
      <Text style={visLabelStyle}>{label}</Text>
    </View>
  );
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
