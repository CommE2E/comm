// @flow

import invariant from 'invariant';
import * as React from 'react';

import { unreadBackgroundCount } from 'lib/selectors/thread-selectors.js';
import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';

import css from './chat-tabs.css';
import ChatThreadList from './chat-thread-list.react.js';
import { ThreadListContext } from './thread-list-provider.js';
import Tabs, { type TabData } from '../components/tabs.react.js';
import { useSelector } from '../redux/redux-utils.js';

type TabType = 'Home' | 'Muted';

function ChatTabs(): React.Node {
  let mutedTitle = threadSettingsNotificationsCopy.MUTED;
  const unreadBackgroundCountVal = useSelector(unreadBackgroundCount);
  if (unreadBackgroundCountVal) {
    mutedTitle += ` (${unreadBackgroundCountVal})`;
  }

  const tabsData: $ReadOnlyArray<TabData<TabType>> = React.useMemo(
    () => [
      {
        id: 'Home',
        header: threadSettingsNotificationsCopy.HOME,
      },
      {
        id: 'Muted',
        header: mutedTitle,
      },
    ],
    [mutedTitle],
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

  const chatTabs = React.useMemo(
    () => (
      <div className={css.container}>
        {tabs}
        <div className={css.threadList}>
          <ChatThreadList />
        </div>
      </div>
    ),
    [tabs],
  );

  return chatTabs;
}

export default ChatTabs;
