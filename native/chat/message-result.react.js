// @flow

import * as React from 'react';
import { View } from 'react-native';

import { type ThreadInfo } from 'lib/types/thread-types.js';

import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type MessageResultProps = {
  +item: ChatMessageInfoItemWithHeight,
  +threadInfo: ThreadInfo,
};

/* eslint-disable no-unused-vars */
function MessageResult(props: MessageResultProps): React.Node {
  return <View />;
}

export default MessageResult;
