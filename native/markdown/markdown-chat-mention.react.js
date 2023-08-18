// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import {
  useMarkdownOnPressUtils,
  useHandleChatMentionClick,
} from './markdown-utils.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +threadInfo: ResolvedThreadInfo,
  +hasAccessToChat: boolean,
  +children: React.Node,
  ...TextProps,
};
function MarkdownChatMention(props: Props): React.Node {
  const { threadInfo, hasAccessToChat, style, ...rest } = props;
  const { messageKey, shouldBePressable, onLongPressHandler } =
    useMarkdownOnPressUtils(!hasAccessToChat);
  const onPressHandler = useHandleChatMentionClick(threadInfo, messageKey);
  return (
    <Text
      onPress={shouldBePressable ? onPressHandler : null}
      onLongPress={shouldBePressable ? onLongPressHandler : null}
      style={hasAccessToChat ? style : null}
      {...rest}
    />
  );
}

export default MarkdownChatMention;
