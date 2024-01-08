// @flow

import invariant from 'invariant';
import * as React from 'react';

import ThreadDraftUpdater from 'lib/components/thread-draft-updater.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import ChatMessageListContainer from './chat-message-list-container.react.js';
import ChatTabs from './chat-tabs.react.js';
import ChatThreadList from './chat-thread-list.react.js';
import css from './chat.css';
import { ThreadListProvider } from './thread-list-provider.js';
import ThreadTopBar from './thread-top-bar.react.js';
import Panel, { type PanelData } from '../components/panel.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useThreadInfoForPossiblyPendingThread } from '../utils/thread-utils.js';

function Chat(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const chatModeIsCreate = useSelector(
    state => state.navInfo.chatMode === 'create',
  );

  const threadInfo = useThreadInfoForPossiblyPendingThread(activeChatThreadID);
  invariant(threadInfo, 'threadInfo should be set');

  const chatList = React.useMemo(() => <ChatThreadList />, []);
  const messageList = React.useMemo(() => {
    if (!activeChatThreadID && !chatModeIsCreate) {
      return null;
    }
    return (
      <>
        <ChatMessageListContainer activeChatThreadID={activeChatThreadID} />
      </>
    );
  }, [activeChatThreadID, chatModeIsCreate]);

  let threadDraftUpdater = null;
  if (loggedIn) {
    threadDraftUpdater = <ThreadDraftUpdater />;
  }

  const panelData: $ReadOnlyArray<PanelData> = React.useMemo(
    () => [
      {
        header: <ChatTabs />,
        body: chatList,
        classNameOveride: css.threadListPanel,
      },
      {
        header: <ThreadTopBar threadInfo={threadInfo} />,
        body: messageList,
        classNameOveride: css.messageListPanel,
      },
    ],
    [chatList, messageList, threadInfo],
  );

  const chatPanel = React.useMemo(
    () => <Panel panelItems={panelData} />,
    [panelData],
  );

  return (
    <>
      <ThreadListProvider>{chatPanel}</ThreadListProvider>
      {threadDraftUpdater}
    </>
  );
}

const MemoizedChat: React.ComponentType<{}> = React.memo<{}>(Chat);

export default MemoizedChat;
