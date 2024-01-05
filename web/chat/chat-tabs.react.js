// @flow

import invariant from 'invariant';
import * as React from 'react';

import { unreadBackgroundCount } from 'lib/selectors/thread-selectors.js';

import css from './chat-tabs.css';
import ChatThreadList from './chat-thread-list.react.js';
import { ThreadListContext } from './thread-list-provider.js';
import Tabs, { type TabData } from '../components/tabs.react.js';
import { useSelector } from '../redux/redux-utils.js';

type TabType = 'Background' | 'Focus';

function ChatTabs(): React.Node {
  let backgroundTitle = 'Background';
  const unreadBackgroundCountVal = useSelector(unreadBackgroundCount);
  if (unreadBackgroundCountVal) {
    backgroundTitle += ` (${unreadBackgroundCountVal})`;
  }

  const tabsData: $ReadOnlyArray<TabData<TabType>> = React.useMemo(
    () => [
      {
        id: 'Focus',
        header: 'Focused',
      },
      {
        id: 'Background',
        header: backgroundTitle,
      },
    ],
    [backgroundTitle],
  );

  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const { activeTab, setActiveTab } = threadListContext;

  const tabs = React.useMemo(
    () => (
      <Tabs
        tabItems={tabsData}
        activeTab={activeTab}
        setTab={setActiveTab}
        headerStyle="pill"
      />
    ),
    [activeTab, setActiveTab, tabsData],
  );

  return (
    <div className={css.container}>
      {tabs}
      <div className={css.threadList}>
        <ChatThreadList />
      </div>
    </div>
  );
}

export default ChatTabs;
