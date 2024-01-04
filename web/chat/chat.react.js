// @flow

import * as React from 'react';

import ThreadDraftUpdater from 'lib/components/thread-draft-updater.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import ChatTabs from './chat-tabs.react.js';
import ChatThreadList from './chat-thread-list.react.js';
import css from './chat.css';
import { ThreadListProvider } from './thread-list-provider.js';
import Panel, { type PanelData } from '../components/panel.react.js';
import { useSelector } from '../redux/redux-utils.js';

function Chat(): React.Node {
  const loggedIn = useSelector(isLoggedIn);

  const chatList = React.useMemo(() => <ChatThreadList />, []);

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
    ],
    [chatList],
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
