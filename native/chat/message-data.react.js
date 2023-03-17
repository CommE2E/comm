// @flow

import {
  type ChatMessageItem,
  type UseMessageListDataArgs,
  useMessageListData,
} from 'lib/selectors/chat-selectors.js';

export type NativeChatMessageItem = ChatMessageItem;

type MessageListData = ?(NativeChatMessageItem[]);

function useNativeMessageListData(
  args: UseMessageListDataArgs,
): MessageListData {
  return useMessageListData(args);
}

export { useNativeMessageListData };
