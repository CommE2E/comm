// @flow

import invariant from 'invariant';
import * as React from 'react';

import { unreadBackgroundCount } from 'lib/selectors/thread-selectors.js';

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

  const chatTabs = React.useMemo(
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

  return chatTabs;
}

export default ChatTabs;
