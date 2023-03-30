// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import { avatarOffset } from './chat-constants.js';
import UserAvatar from '../components/user-avatar.react.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +item: ChatMessageInfoItemWithHeight,
};

function MessageTooltipButtonAvatar(props: Props): React.Node {
  const { item } = props;

  const shouldRenderAvatars = useShouldRenderAvatars();

  if (item.messageInfo.creator.isViewer || !shouldRenderAvatars) {
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
