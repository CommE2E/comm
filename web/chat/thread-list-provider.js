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
  threadIsTopLevel,
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

const ThreadListContext = React.createContext<?ThreadListContextType>();

type ThreadListProviderProps = {|
  +children: React.Node,
|};
function ThreadListProvider(props: ThreadListProviderProps) {
  const [activeTab, setActiveTab] = React.useState('HOME');

  const activeChatThreadItem = useSelector(activeChatThreadItemSelector);
  const activeThreadInfo = activeChatThreadItem?.threadInfo;
  const activeThreadFromHomeTab =
    activeThreadInfo?.currentUser.subscription.home;
  const activeThreadID = activeThreadInfo?.id;
  const activeThreadHasSpecificTab = threadIsTopLevel(activeThreadInfo);
  const activeThreadIsFromDifferentTab =
    (activeTab === 'BACKGROUND' && activeThreadFromHomeTab) ||
    (activeTab === 'HOME' && !activeThreadFromHomeTab);
  const prevActiveThreadIDRef = React.useRef<?string>();
  const shouldChangeTab =
    activeThreadHasSpecificTab && activeThreadIsFromDifferentTab;
  React.useEffect(() => {
    const prevActiveThreadID = prevActiveThreadIDRef.current;
    prevActiveThreadIDRef.current = activeThreadID;
    if (activeThreadID !== prevActiveThreadID && shouldChangeTab) {
      setActiveTab(activeThreadFromHomeTab ? 'HOME' : 'BACKGROUND');
    }
  }, [activeThreadID, activeThreadFromHomeTab, shouldChangeTab]);

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

      const result = [];
      for (const item of threadListData) {
        if (
          activeChatThreadItem.threadInfo.parentThreadID !== item.threadInfo.id
        ) {
          result.push(item);
          continue;
        }

        const { parentThreadID } = activeChatThreadItem.threadInfo;
        invariant(
          parentThreadID,
          `thread ID ${activeChatThreadItem.threadInfo.id} is a sidebar ` +
            'without a parent',
        );

        for (const sidebarItem of item.sidebars) {
          if (sidebarItem.type !== 'sidebar') {
            continue;
          } else if (
            sidebarItem.threadInfo.id === activeChatThreadItem.threadInfo.id
          ) {
            return threadListData;
          }
        }

        let indexToInsert = item.sidebars.findIndex(
          (sidebar) =>
            sidebar.lastUpdatedTime === undefined ||
            sidebar.lastUpdatedTime < activeChatThreadItem.lastUpdatedTime,
        );
        if (indexToInsert === -1) {
          indexToInsert = item.sidebars.length;
        }
        const activeSidebar = {
          type: 'sidebar',
          lastUpdatedTime: activeChatThreadItem.lastUpdatedTime,
          mostRecentNonLocalMessage:
            activeChatThreadItem.mostRecentNonLocalMessage,
          threadInfo: activeChatThreadItem.threadInfo,
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
    [activeChatThreadItem],
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
