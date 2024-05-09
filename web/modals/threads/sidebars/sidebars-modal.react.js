// @flow

import * as React from 'react';

import { useFilteredChildThreads } from 'lib/hooks/child-threads.js';
import {
  threadIsSidebar,
  useThreadsInChatList,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import SidebarList from './sidebar-list.react.js';
import css from './sidebars-modal.css';
import Tabs, { type TabData } from '../../../components/tabs.react.js';
import SearchModal from '../../search-modal.react.js';

type SidebarTab = 'All Threads' | 'My Threads';

const tabsData: $ReadOnlyArray<TabData<SidebarTab>> = [
  {
    id: 'All Threads',
    header: 'All Threads',
  },
  {
    id: 'My Threads',
    header: 'My Threads',
  },
];

type ContentProps = {
  +searchText: string,
  +threadID: string,
  +defaultTab: SidebarTab,
};

function SidebarsModalContent(props: ContentProps): React.Node {
  const { searchText, threadID, defaultTab } = props;
  const [tab, setTab] = React.useState<SidebarTab>(defaultTab);

  const tabs = React.useMemo(
    () => <Tabs tabItems={tabsData} activeTab={tab} setTab={setTab} />,
    [tab],
  );

  const sidebarList = useFilteredChildThreads(threadID, {
    predicate: threadIsSidebar,
    searchText,
  });

  const sidebarThreadInfos: $ReadOnlyArray<ThreadInfo> = React.useMemo(
    () => sidebarList.map(chatItem => chatItem.threadInfo),
    [sidebarList],
  );

  const visibleSidebarThreadInfos = useThreadsInChatList(sidebarThreadInfos);
  const visibleSidebarThreadIDs = React.useMemo(
    () => new Set(visibleSidebarThreadInfos.map(thread => thread.id)),
    [visibleSidebarThreadInfos],
  );

  const tabContent = React.useMemo(() => {
    if (tab === 'All Threads') {
      return <SidebarList sidebars={sidebarList} />;
    }

    const sidebarsChatListVisibleInChat = sidebarList.filter(chatItem =>
      visibleSidebarThreadIDs.has(chatItem.threadInfo.id),
    );

    return <SidebarList sidebars={sidebarsChatListVisibleInChat} />;
  }, [sidebarList, tab, visibleSidebarThreadIDs]);

  const sidebarsModalContent = React.useMemo(
    () => (
      <div className={css.sidebarListContainer}>
        {tabs}
        {tabContent}
      </div>
    ),
    [tabContent, tabs],
  );

  return sidebarsModalContent;
}

type Props = {
  +threadID: string,
  +onClose: () => void,
  +defaultTab?: SidebarTab,
};

function SidebarsModal(props: Props): React.Node {
  const { threadID, onClose, defaultTab = 'All Threads' } = props;

  const sidebarsContent = React.useCallback(
    (searchText: string) => (
      <SidebarsModalContent
        searchText={searchText}
        defaultTab={defaultTab}
        threadID={threadID}
      />
    ),
    [defaultTab, threadID],
  );

  return (
    <SearchModal
      name="Threads"
      searchPlaceholder="Search"
      onClose={onClose}
      size="large"
    >
      {sidebarsContent}
    </SearchModal>
  );
}

export default SidebarsModal;
