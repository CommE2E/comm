// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import { getAvatarForUser } from 'lib/shared/avatar-utils.js';

import { avatarOffset } from './chat-constants.js';
import Avatar from '../components/avatar.react.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +item: ChatMessageInfoItemWithHeight,
};

function MessageTooltipButtonAvatar(props: Props): React.Node {
  const { item } = props;

  const avatarInfo = React.useMemo(
    () => getAvatarForUser(item.messageInfo.creator),
    [item.messageInfo.creator],
  );

  const shouldRenderAvatars = useShouldRenderAvatars();

  if (item.messageInfo.creator.isViewer || !shouldRenderAvatars) {
    return null;
  }
  return (
    <View style={styles.avatarContainer}>
      <Avatar size="small" avatarInfo={avatarInfo} />
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

export default MessageTooltipButtonAvatar;
