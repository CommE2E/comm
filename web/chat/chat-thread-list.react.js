// @flow

import invariant from 'invariant';
import _sum from 'lodash/fp/sum.js';
import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList } from 'react-window';

import { emptyItemText } from 'lib/shared/thread-utils.js';

import ChatThreadListItem from './chat-thread-list-item.react.js';
import css from './chat-thread-list.css';
import { ThreadListContext } from './thread-list-provider.js';
import BackgroundIllustration from '../assets/background-illustration.react.js';
import Button from '../components/button.react.js';
import Search from '../components/search.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnClickNewThread } from '../selectors/thread-selectors.js';

const sizes = {
  search: 68,
  thread: 81,
  sidebars: { sidebar: 32, seeMore: 22, spacer: 6 },
};

const getThreadItemSize = item => {
  const sidebarHeight = _sum(item.sidebars.map(s => sizes.sidebars[s.type]));
  return sizes.thread + sidebarHeight;
};

const renderItem = ({ index, data, style }) => {
  return (
    <div style={style}>
      {index === 0 ? data[0] : <ChatThreadListItem item={data[index]} />}
    </div>
  );
};

function ChatThreadList(): React.Node {
  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const { activeTab, threadList, setSearchText, searchText } =
    threadListContext;

  const onClickNewThread = useOnClickNewThread();

  const isThreadCreation = useSelector(
    state => state.navInfo.chatMode === 'create',
  );

  const isBackground = activeTab === 'Background';

  const communityID = useSelector(state => state.communityPickerStore.chat);

  const search = React.useMemo(
    () => (
      <Search
        onChangeText={setSearchText}
        searchText={searchText}
        placeholder="Search chats"
      />
    ),
    [searchText, setSearchText],
  );

  const threadListContainerRef = React.useRef();

  const threads = React.useMemo(
    () =>
      threadList.filter(
        item =>
          !communityID ||
          item.threadInfo.community === communityID ||
          item.threadInfo.id === communityID,
      ),
    [communityID, threadList],
  );

  React.useEffect(() => {
    if (threadListContainerRef.current) {
      threadListContainerRef.current.resetAfterIndex(0, false);
    }
  }, [threads]);

  const threadListContainer = React.useMemo(() => {
    if (isBackground && threads.length === 0) {
      return (
        <>
          {search}
          <EmptyItem />
        </>
      );
    }

    const items = [search, ...threads];

    const itemKey = index =>
      index === 0 ? 'search' : items[index].threadInfo.id;

    const itemSize = index => {
      if (index === 0) {
        return sizes.search;
      }

      return getThreadItemSize(items[index]);
    };

    return (
      <AutoSizer disableWidth>
        {({ height }) => (
          <VariableSizeList
            itemData={items}
            itemCount={items.length}
            itemSize={itemSize}
            itemKey={itemKey}
            height={height}
            overscanCount={1}
            ref={threadListContainerRef}
          >
            {renderItem}
          </VariableSizeList>
        )}
      </AutoSizer>
    );
  }, [isBackground, search, threads]);

  return (
    <>
      <div className={css.threadListContainer}>{threadListContainer}</div>
      <div className={css.createNewThread}>
        <Button
          variant="filled"
          disabled={isThreadCreation}
          onClick={onClickNewThread}
        >
          Create new chat
        </Button>
      </div>
    </>
  );
}

function EmptyItem() {
  return (
    <div className={css.emptyItemContainer}>
      <BackgroundIllustration />
      <div className={css.emptyItemText}>{emptyItemText}</div>
    </div>
  );
}

export default ChatThreadList;
