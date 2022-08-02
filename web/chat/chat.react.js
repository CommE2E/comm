// @flow

import * as React from 'react';

import { useSelector } from '../redux/redux-utils';
import ChatMessageListContainer from './chat-message-list-container.react';
import ChatTabs from './chat-tabs.react';
import { ThreadListProvider } from './thread-list-provider';

function Chat(): React.Node {
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const chatList = React.useMemo(
    () => (
      <ThreadListProvider>
        <ChatTabs />
      </ThreadListProvider>
    ),
    [],
  );
  const messageList = React.useMemo(() => {
    if (!activeChatThreadID) {
      return null;
    }
    return <ChatMessageListContainer activeChatThreadID={activeChatThreadID} />;
  }, [activeChatThreadID]);

  return (
    <>
      {chatList}
      {messageList}
    </>
  );
}

const MemoizedChat: React.ComponentType<{}> = React.memo<{}>(Chat);

export default MemoizedChat;
