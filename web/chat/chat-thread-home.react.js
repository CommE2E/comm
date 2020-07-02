// @flow

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils';

import ChatThreadList from './chat-thread-list.react';

export default function ChatThreadHome() {
  return <ChatThreadList filterThreads={threadInHomeChatList} />;
}
