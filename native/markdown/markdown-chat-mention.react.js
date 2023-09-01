// @flow

import * as React from 'react';
import { Text, StyleSheet } from 'react-native';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import { useMarkdownOnPressUtils } from './markdown-utils.js';
import { useNavigateToThreadWithFadeAnimation } from '../chat/message-list-types.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +threadInfo: ResolvedThreadInfo,
  +hasAccessToChat: boolean,
  +children: React.Node,
  ...TextProps,
};
function MarkdownChatMention(props: Props): React.Node {
  const { threadInfo, hasAccessToChat, ...rest } = props;
  const { messageKey, isRevealed, onLongPressHandler } =
    useMarkdownOnPressUtils();
  const shouldBePressable = hasAccessToChat ? isRevealed : false;
  const onPressHandler = useNavigateToThreadWithFadeAnimation(
    threadInfo,
    messageKey,
  );
  return (
    <Text
      onPress={shouldBePressable ? onPressHandler : null}
      onLongPress={shouldBePressable ? onLongPressHandler : null}
      style={hasAccessToChat ? styles.mention : null}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  mention: {
    fontWeight: 'bold',
  },
});

export default MarkdownChatMention;
