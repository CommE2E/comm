// @flow

import * as React from 'react';

import ThreadDraftUpdater from 'lib/components/thread-draft-updater.react';
import { isLoggedIn } from 'lib/selectors/user-selectors';

import { useSelector } from '../redux/redux-utils';
import ChatMessageListContainer from './chat-message-list-container.react';
import ChatTabs from './chat-tabs.react';
import { ThreadListProvider } from './thread-list-provider';

function Chat(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
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
