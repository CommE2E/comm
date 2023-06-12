// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import { avatarOffset } from './chat-constants.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type Props = {
  +item: ChatMessageInfoItemWithHeight,
};

function MessageTooltipButtonAvatar(props: Props): React.Node {
  const { item } = props;

  if (item.messageInfo.creator.isViewer) {
    return null;
  }
  return (
    <View style={styles.avatarContainer}>
      <UserAvatar size="small" userID={item.messageInfo.creator.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    bottom: 0,
    left: -avatarOffset,
    position: 'absolute',
  },
});

const MemoizedMessageTooltipButtonAvatar: React.ComponentType<Props> =
  React.memo(MessageTooltipButtonAvatar);

export default MemoizedMessageTooltipButtonAvatar;
