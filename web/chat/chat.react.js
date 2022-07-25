// @flow

import * as React from 'react';

import ChatMessageListContainer from './chat-message-list-container.react';
import ChatTabs from './chat-tabs.react';
import { ThreadListProvider } from './thread-list-provider';

function Chat(): React.Node {
  return (
    <>
      <ThreadListProvider>
        <ChatTabs />
      </ThreadListProvider>
      <ChatMessageListContainer />
    </>
  );
}

const MemoizedChat: React.ComponentType<{}> = React.memo<{}>(Chat);

export default MemoizedChat;
