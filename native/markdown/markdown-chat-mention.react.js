// @flow

import * as React from 'react';
import { Text, StyleSheet } from 'react-native';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import { useMarkdownOnPressUtils } from './markdown-utils.js';
import { useNavigateToThreadWithFadeAnimation } from '../chat/message-list-types.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +threadInfo: ResolvedThreadInfo,
  +children: React.Node,
  ...TextProps,
};
function MarkdownChatMention(props: Props): React.Node {
  const { threadInfo, ...rest } = props;
  const { messageKey, isRevealed, onLongPressHandler } =
    useMarkdownOnPressUtils();
  const onPressHandler = useNavigateToThreadWithFadeAnimation(
    threadInfo,
    messageKey,
  );
  return (
    <Text
      onPress={isRevealed ? onPressHandler : null}
      onLongPress={isRevealed ? onLongPressHandler : null}
      style={styles.mention}
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
