// @flow

import * as React from 'react';

import ThreadDraftUpdater from 'lib/components/thread-draft-updater.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import ChatMessageListContainer from './chat-message-list-container.react.js';
import ChatTabs from './chat-tabs.react.js';
import { ThreadListProvider } from './thread-list-provider.js';
import { useSelector } from '../redux/redux-utils.js';

function Chat(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const chatModeIsCreate = useSelector(
    state => state.navInfo.chatMode === 'create',
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
    if (!activeChatThreadID && !chatModeIsCreate) {
      return null;
    }
    return <ChatMessageListContainer activeChatThreadID={activeChatThreadID} />;
  }, [activeChatThreadID, chatModeIsCreate]);

  let threadDraftUpdater = null;
  if (loggedIn) {
    threadDraftUpdater = <ThreadDraftUpdater />;
  }
  return (
    <>
      {chatList}
      {messageList}
      {threadDraftUpdater}
    </>
  );
}

const MemoizedChat: React.ComponentType<{}> = React.memo<{}>(Chat);

export default MemoizedChat;
