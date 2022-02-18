// @flow

import * as React from 'react';

import ChatMessageList from './chat-message-list.react';
import ChatTabs from './chat-tabs.react';
import { ThreadListProvider } from './thread-list-provider';

function Chat(): React.Node {
  return (
    <>
      <ThreadListProvider>
        <ChatTabs />
      </ThreadListProvider>
      <ChatMessageList />
    </>
  );
}

export default Chat;
