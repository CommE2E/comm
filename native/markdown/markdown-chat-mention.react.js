// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import { useMarkdownOnPressUtils } from './markdown-utils.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +threadInfo: ResolvedThreadInfo,
  +hasAccessToChat: boolean,
  +children: React.Node,
  ...TextProps,
};
function MarkdownChatMention(props: Props): React.Node {
  const { threadInfo, hasAccessToChat, ...rest } = props;
  const { shouldBePressable, onLongPressHandler } = useMarkdownOnPressUtils(
    !hasAccessToChat,
  );
  return (
    <Text
      onLongPress={shouldBePressable ? onLongPressHandler : null}
      {...rest}
    />
  );
}

export default MarkdownChatMention;
