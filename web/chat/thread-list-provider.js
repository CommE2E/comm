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
import type { ThreadInfo } from 'lib/types/thread-types';
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
|};

const ThreadListContext = React.createContext<?ThreadListContextType>();

type ThreadListProviderProps = {|
  +activeTab: ChatTabType,
  +activeThreadInfo: ?ThreadInfo,
  +children: React.Node,
|};
function ThreadListProvider(props: ThreadListProviderProps) {
  const { activeTab, activeThreadInfo, children } = props;

  const activeSidebarParentThreadInfo = useSelector((state) => {
    if (!activeThreadInfo || activeThreadInfo.type !== threadTypes.SIDEBAR) {
      return null;
    }
    const { parentThreadID } = activeThreadInfo;
    invariant(parentThreadID, 'sidebar must have parent thread');
    return threadInfoSelector(state)[parentThreadID];
  });
  const activeTopLevelThread =
    activeThreadInfo?.type === threadTypes.SIDEBAR
      ? activeSidebarParentThreadInfo
      : activeThreadInfo;

  const activeTopLevelThreadIsInChatList = React.useMemo(
    () => threadInChatList(activeTopLevelThread),
    [activeTopLevelThread],
  );
  const activeThreadID = useSelector(
    (state) => state.navInfo.activeChatThreadID,
  );
  const activeThreadOriginalTab = React.useMemo(() => {
    if (activeTopLevelThreadIsInChatList) {
      return null;
    }
    return activeTab;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopLevelThreadIsInChatList, activeThreadID]);

  const activeItem = useSelector(activeChatThreadItemSelector);
  const makeSureActiveSidebarIsIncluded = React.useCallback(
    (threadListData: $ReadOnlyArray<ChatThreadItem>) => {
      if (!activeItem || activeItem.threadInfo.type !== threadTypes.SIDEBAR) {
        return threadListData;
      }

      const result = [];
      for (const item of threadListData) {
        if (activeItem.threadInfo.parentThreadID !== item.threadInfo.id) {
          result.push(item);
          continue;
        }

        const { parentThreadID } = activeItem.threadInfo;
        invariant(
          parentThreadID,
          `thread ID ${activeItem.threadInfo.id} is a sidebar without a parent`,
        );

        for (const sidebarItem of item.sidebars) {
          if (sidebarItem.type !== 'sidebar') {
            continue;
          } else if (sidebarItem.threadInfo.id === activeItem.threadInfo.id) {
            return threadListData;
          }
        }

        let indexToInsert = item.sidebars.findIndex(
          (sidebar) =>
            sidebar.lastUpdatedTime === undefined ||
            sidebar.lastUpdatedTime < activeItem.lastUpdatedTime,
        );
        if (indexToInsert === -1) {
          indexToInsert = item.sidebars.length;
        }
        const activeSidebar = {
          type: 'sidebar',
          lastUpdatedTime: activeItem.lastUpdatedTime,
          mostRecentNonLocalMessage: activeItem.mostRecentNonLocalMessage,
          threadInfo: activeItem.threadInfo,
        };
        const newSidebarItems = [
          ...item.sidebars.slice(0, indexToInsert),
          activeSidebar,
          ...item.sidebars.slice(indexToInsert),
        ];

        result.push({
          ...item,
          sidebars: newSidebarItems,
        });
      }

      return result;
    },
    [activeItem],
  );
  const chatListData = useSelector(chatListDataSelector);
  const activeTopLevelChatThreadItem = useChatThreadItem(activeTopLevelThread);
  const { homeThreadList, backgroundThreadList } = React.useMemo(() => {
    const home = chatListData.filter((item) =>
      threadInHomeChatList(item.threadInfo),
    );
    const background = chatListData.filter((item) =>
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
    }),
    [activeTab, currentThreadList],
  );

  return (
    <ThreadListContext.Provider value={threadListContext}>
      {children}
    </ThreadListContext.Provider>
  );
}

export { ThreadListProvider, ThreadListContext };
