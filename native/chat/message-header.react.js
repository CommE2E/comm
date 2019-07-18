// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { stringForUser } from 'lib/shared/user-utils';

import Timestamp from './timestamp.react';

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  focused: bool,
  color: 'light' | 'dark',
|};
function MessageHeader(props: Props) {
  const { item, focused, color } = props;
  const { creator, time } = item.messageInfo;
  const { isViewer } = creator;

  let authorName = null;
  if (!isViewer && (item.startsCluster || focused)) {
    const style = color === 'light'
      ? [ styles.authorName, styles.light ]
      : [ styles.authorName, styles.dark ];
    authorName = (
      <Text style={style} numberOfLines={1}>
        {stringForUser(creator)}
      </Text>
    );
  }

  const timestamp = focused || item.startsConversation
    ? <Timestamp time={time} color={color} />
    : null;
  if (!timestamp && !authorName) {
    return null;
  }

  const style = !item.startsCluster
    ? styles.clusterMargin
    : null;
  return (
    <View style={style}>
      {timestamp}
      {authorName}
    </View>
  );
}

const styles = StyleSheet.create({
  clusterMargin: {
    marginTop: 7,
  },
  authorName: {
    color: '#777777',
    fontSize: 14,
    marginLeft: 12,
    marginRight: 7,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 25,
  },
  dark: {
    color: '#777777',
  },
  light: {
    color: 'white',
  },
});

export default MessageHeader;
