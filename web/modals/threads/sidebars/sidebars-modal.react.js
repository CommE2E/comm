// @flow

import * as React from 'react';

import { useFilteredChildThreads } from 'lib/hooks/child-threads.js';
import { threadInChatList, threadIsSidebar } from 'lib/shared/thread-utils.js';

import Tabs from '../../../components/tabs.react.js';
import SearchModal from '../../search-modal.react.js';
import SidebarList from './sidebar-list.react.js';
import css from './sidebars-modal.css';

type SidebarTab = 'All Threads' | 'My Threads';

type ContentProps = {
  +searchText: string,
  +threadID: string,
  +defaultTab: SidebarTab,
};

function SidebarsModalContent(props: ContentProps): React.Node {
  const { searchText, threadID, defaultTab } = props;
  const [tab, setTab] = React.useState<SidebarTab>(defaultTab);

  const sidebarList = useFilteredChildThreads(threadID, {
    predicate: threadIsSidebar,
    searchText,
  });

  const sidebarsChatListVisibleInChat = sidebarList.filter(chatItem =>
    threadInChatList(chatItem.threadInfo),
  );

  return (
    <div className={css.sidebarListContainer}>
      <Tabs.Container activeTab={tab} setTab={setTab}>
        <Tabs.Item id="All Threads" header="All Threads">
          <SidebarList sidebars={sidebarList} />
        </Tabs.Item>
        <Tabs.Item id="My Threads" header="My Threads">
          <SidebarList sidebars={sidebarsChatListVisibleInChat} />
        </Tabs.Item>
      </Tabs.Container>
    </div>
  );
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
      size="fit-content"
    >
      {sidebarsContent}
    </SearchModal>
  );
}

export default SidebarsModal;
