// @flow

import invariant from 'invariant';
import _sum from 'lodash/fp/sum.js';
import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList } from 'react-window';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import genesis from 'lib/facts/genesis.js';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { emptyItemText } from 'lib/shared/thread-utils.js';

import ChatThreadListItem from './chat-thread-list-item.react.js';
import ChatThreadListSearch from './chat-thread-list-search.react.js';
import css from './chat-thread-list.css';
import { ThreadListContext } from './thread-list-provider.js';
import BackgroundIllustration from '../assets/background-illustration.react.js';
import Button from '../components/button.react.js';
import ComposeSubchannelModal from '../modals/threads/create/compose-subchannel-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnClickNewThread } from '../selectors/thread-selectors.js';

type Item = ChatThreadItem | { +type: 'search' } | { +type: 'empty' };

const sizes = {
  search: 68,
  empty: 249,
  thread: 81,
  sidebars: { sidebar: 32, seeMore: 22, spacer: 6 },
};

const itemKey = (index: number, data: $ReadOnlyArray<Item>) => {
  if (data[index].type === 'search') {
    return 'search';
  } else if (data[index].type === 'empty') {
    return 'empty';
  } else {
    return data[index].threadInfo.id;
  }
};

type RenderItemInput = {
  +index: number,
  +data: $ReadOnlyArray<Item>,
  +style: CSSStyleDeclaration,
};
const renderItem: RenderItemInput => React.Node = ({ index, data, style }) => {
  let item;
  if (data[index].type === 'search') {
    item = <ChatThreadListSearch />;
  } else if (data[index].type === 'empty') {
    item = <EmptyItem />;
  } else {
    item = <ChatThreadListItem item={data[index]} />;
  }

  return <div style={style}>{item}</div>;
};

type VariableSizeListRef = {
  +resetAfterIndex: (index: number, shouldForceUpdate?: boolean) => void,
  ...
};

function ChatThreadList(): React.Node {
  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const { activeTab, threadList } = threadListContext;

  const onClickNewThread = useOnClickNewThread();

  const isThreadCreation = useSelector(
    state => state.navInfo.chatMode === 'create',
  );

  const isBackground = activeTab === 'Background';

  const communityID = useSelector(state => state.communityPickerStore.chat);

  const communityThreadInfo = useSelector(state => {
    if (!communityID) {
      return null;
    }
    return threadInfoSelector(state)[communityID];
  });

  const { pushModal, popModal } = useModalContext();

  const onClickCreateSubchannel = React.useCallback(() => {
    if (!communityThreadInfo) {
      return null;
    }
    return pushModal(
      <ComposeSubchannelModal
        parentThreadInfo={communityThreadInfo}
        onClose={popModal}
      />,
    );
  }, [popModal, pushModal, communityThreadInfo]);

  const isChatCreation = !communityID || communityID === genesis.id;

  const onClickCreate = isChatCreation
    ? onClickNewThread
    : onClickCreateSubchannel;

  const createButtonText = isChatCreation
    ? 'Create new chat'
    : 'Create new channel';

  const threadListContainerRef = React.useRef<?VariableSizeListRef>();

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
    const items: Item[] = [{ type: 'search' }, ...threads];

    if (isBackground && threads.length === 0) {
      items.push({ type: 'empty' });
    }

    const itemSize = (index: number) => {
      if (items[index].type === 'search') {
        return sizes.search;
      } else if (items[index].type === 'empty') {
        return sizes.empty;
      }

      const sidebarHeight = _sum(
        items[index].sidebars.map(s => sizes.sidebars[s.type]),
      );

      const rowGap = index === items.length - 1 ? 0 : 8;

      return sizes.thread + sidebarHeight + rowGap;
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
            ref={threadListContainerRef}
          >
            {renderItem}
          </VariableSizeList>
        )}
      </AutoSizer>
    );
  }, [isBackground, threads]);

  return (
    <>
      <div className={css.threadListContainer}>{threadListContainer}</div>
      <div className={css.createNewThread}>
        <Button
          variant="filled"
          disabled={isThreadCreation}
          onClick={onClickCreate}
        >
          {createButtonText}
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
