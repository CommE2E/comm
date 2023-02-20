// @flow

import invariant from 'invariant';
import * as React from 'react';

import { unreadBackgroundCount } from 'lib/selectors/thread-selectors.js';

import css from './chat-tabs.css';
import ChatThreadList from './chat-thread-list.react.js';
import ChatThreadTab from './chat-thread-tab.react.js';
import { ThreadListContext } from './thread-list-provider.js';
import Tabs from '../components/tabs.react.js';
import { useSelector } from '../redux/redux-utils.js';

function ChatTabs(): React.Node {
  let backgroundTitle = 'Background';
  const unreadBackgroundCountVal = useSelector(unreadBackgroundCount);
  if (unreadBackgroundCountVal) {
    backgroundTitle += ` (${unreadBackgroundCountVal})`;
  }
  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const { activeTab, setActiveTab } = threadListContext;

  const setActiveChatTab = React.useCallback(
    (newTab: 'Background' | 'Focus') => {
      setActiveTab(newTab);
    },
    [setActiveTab],
  );

  const chatThreadList = React.useMemo(
    () => (
      <div className={css.threadList}>
        <ChatThreadList />
      </div>
    ),
    [],
  );

  const focusTabsItem = React.useMemo(
    () => (
      <Tabs.Item id="Focus" header={<ChatThreadTab title="Focused" />}>
        {chatThreadList}
      </Tabs.Item>
    ),
    [chatThreadList],
  );

  const backgroundTabsItem = React.useMemo(
    () => (
      <Tabs.Item
        id="Background"
        header={<ChatThreadTab title={backgroundTitle} />}
      >
        {chatThreadList}
      </Tabs.Item>
    ),
    [backgroundTitle, chatThreadList],
  );

  return (
    <div className={css.container}>
      <Tabs.Container
        activeTab={activeTab}
        setTab={setActiveChatTab}
        isPillStyle={true}
      >
        {focusTabsItem}
        {backgroundTabsItem}
      </Tabs.Container>
    </div>
  );
}

export default ChatTabs;
