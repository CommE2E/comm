// @flow

import invariant from 'invariant';
import * as React from 'react';

import { emptyItemText } from 'lib/shared/thread-utils.js';

import ChatThreadListItem from './chat-thread-list-item.react.js';
import css from './chat-thread-list.css';
import { ThreadListContext } from './thread-list-provider.js';
import BackgroundIllustration from '../assets/background-illustration.react.js';
import Button from '../components/button.react.js';
import Search from '../components/search.react.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  useOnClickNewThread,
  usePickedCommunityChat,
} from '../selectors/thread-selectors.js';

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

  const communityID = usePickedCommunityChat();

  const threadComponents: React.Node[] = React.useMemo(() => {
    const threads = threadList
      .filter(
        item =>
          !communityID ||
          item.threadInfo.community === communityID ||
          item.threadInfo.id === communityID,
      )
      .map(item => <ChatThreadListItem item={item} key={item.threadInfo.id} />);
    if (threads.length === 0 && isBackground) {
      threads.push(<EmptyItem key="emptyItem" />);
    }
    return threads;
  }, [threadList, isBackground, communityID]);

  return (
    <>
      <div className={css.threadListContainer}>
        <Search
          onChangeText={setSearchText}
          searchText={searchText}
          placeholder="Search chats"
        />
        <div>{threadComponents}</div>
      </div>
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
