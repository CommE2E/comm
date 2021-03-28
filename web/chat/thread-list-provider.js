// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  type ChatThreadItem,
  chatListData as chatListDataSelector,
} from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  threadInBackgroundChatList,
  threadInHomeChatList,
  threadInChatList,
} from 'lib/shared/thread-utils';
import { threadTypes } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import {
  useChatThreadItem,
  activeChatThreadItem as activeChatThreadItemSelector,
} from '../selectors/chat-selectors';

type ChatTabType = 'HOME' | 'BACKGROUND';
type ThreadListContextType = {|
  +activeTab: ChatTabType,
  +threadList: $ReadOnlyArray<ChatThreadItem>,
  +setActiveTab: (newActiveTab: ChatTabType) => void,
|};

const ThreadListContext: React.Context<?ThreadListContextType> = React.createContext<?ThreadListContextType>();

type ThreadListProviderProps = {|
  +children: React.Node,
|};
function ThreadListProvider(props: ThreadListProviderProps): React.Node {
  const [activeTab, setActiveTab] = React.useState('HOME');

  const activeChatThreadItem = useSelector(activeChatThreadItemSelector);
  const activeThreadInfo = activeChatThreadItem?.threadInfo;
  const activeThreadID = activeThreadInfo?.id;

  const activeSidebarParentThreadInfo = useSelector(state => {
    if (!activeThreadInfo || activeThreadInfo.type !== threadTypes.SIDEBAR) {
      return null;
    }
    const { parentThreadID } = activeThreadInfo;
    invariant(parentThreadID, 'sidebar must have parent thread');
    return threadInfoSelector(state)[parentThreadID];
  });
  const activeTopLevelThreadInfo =
    activeThreadInfo?.type === threadTypes.SIDEBAR
      ? activeSidebarParentThreadInfo
      : activeThreadInfo;

  const activeTopLevelThreadIsFromHomeTab =
    activeTopLevelThreadInfo?.currentUser.subscription.home;

  const activeTopLevelThreadIsFromDifferentTab =
    (activeTab === 'BACKGROUND' && activeTopLevelThreadIsFromHomeTab) ||
    (activeTab === 'HOME' && !activeTopLevelThreadIsFromHomeTab);

  const activeTopLevelThreadIsInChatList = React.useMemo(
    () => threadInChatList(activeTopLevelThreadInfo),
    [activeTopLevelThreadInfo],
  );

  const shouldChangeTab =
    activeTopLevelThreadIsInChatList && activeTopLevelThreadIsFromDifferentTab;

  const prevActiveThreadIDRef = React.useRef<?string>();
  React.useEffect(() => {
    const prevActiveThreadID = prevActiveThreadIDRef.current;
    prevActiveThreadIDRef.current = activeThreadID;
    if (activeThreadID !== prevActiveThreadID && shouldChangeTab) {
      setActiveTab(activeTopLevelThreadIsFromHomeTab ? 'HOME' : 'BACKGROUND');
    }
  }, [activeThreadID, shouldChangeTab, activeTopLevelThreadIsFromHomeTab]);

  const activeThreadOriginalTab = React.useMemo(() => {
    if (activeTopLevelThreadIsInChatList) {
      return null;
    }
    return activeTab;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopLevelThreadIsInChatList, activeThreadID]);

  const makeSureActiveSidebarIsIncluded = React.useCallback(
    (threadListData: $ReadOnlyArray<ChatThreadItem>) => {
      if (
        !activeChatThreadItem ||
        activeChatThreadItem.threadInfo.type !== threadTypes.SIDEBAR
      ) {
        return threadListData;
      }

      const sidebarParentIndex = threadListData.findIndex(
        thread =>
          thread.threadInfo.id ===
          activeChatThreadItem.threadInfo.parentThreadID,
      );
      if (sidebarParentIndex === -1) {
        return threadListData;
      }
      const parentItem = threadListData[sidebarParentIndex];

      for (const sidebarItem of parentItem.sidebars) {
        if (sidebarItem.type !== 'sidebar') {
          continue;
        } else if (
          sidebarItem.threadInfo.id === activeChatThreadItem.threadInfo.id
        ) {
          return threadListData;
        }
      }

      let indexToInsert = parentItem.sidebars.findIndex(
        sidebar =>
          sidebar.lastUpdatedTime === undefined ||
          sidebar.lastUpdatedTime < activeChatThreadItem.lastUpdatedTime,
      );
      if (indexToInsert === -1) {
        indexToInsert = parentItem.sidebars.length;
      }
      const activeSidebar = {
        type: 'sidebar',
        lastUpdatedTime: activeChatThreadItem.lastUpdatedTime,
        mostRecentNonLocalMessage:
          activeChatThreadItem.mostRecentNonLocalMessage,
        threadInfo: activeChatThreadItem.threadInfo,
      };
      const newSidebarItems = [...parentItem.sidebars];
      newSidebarItems.splice(indexToInsert, 0, activeSidebar);

      const newThreadListData = [...threadListData];
      newThreadListData[sidebarParentIndex] = {
        ...parentItem,
        sidebars: newSidebarItems,
      };
      return newThreadListData;
    },
    [activeChatThreadItem],
  );

  const chatListData = useSelector(chatListDataSelector);
  const activeTopLevelChatThreadItem = useChatThreadItem(
    activeTopLevelThreadInfo,
  );
  const { homeThreadList, backgroundThreadList } = React.useMemo(() => {
    const home = chatListData.filter(item =>
      threadInHomeChatList(item.threadInfo),
    );
    const background = chatListData.filter(item =>
      threadInBackgroundChatList(item.threadInfo),
    );
    if (activeTopLevelChatThreadItem && !activeTopLevelThreadIsInChatList) {
      if (activeThreadOriginalTab === 'HOME') {
        home.unshift(activeTopLevelChatThreadItem);
      } else {
        background.unshift(activeTopLevelChatThreadItem);
      }
    }
    return {
      homeThreadList: makeSureActiveSidebarIsIncluded(home),
      backgroundThreadList: makeSureActiveSidebarIsIncluded(background),
    };
  }, [
    activeThreadOriginalTab,
    activeTopLevelChatThreadItem,
    activeTopLevelThreadIsInChatList,
    chatListData,
    makeSureActiveSidebarIsIncluded,
  ]);

  const currentThreadList =
    activeTab === 'HOME' ? homeThreadList : backgroundThreadList;

  const threadListContext = React.useMemo(
    () => ({
      activeTab,
      threadList: currentThreadList,
      setActiveTab,
    }),
    [activeTab, currentThreadList],
  );

  return (
    <ThreadListContext.Provider value={threadListContext}>
      {props.children}
    </ThreadListContext.Provider>
  );
}

export { ThreadListProvider, ThreadListContext };
