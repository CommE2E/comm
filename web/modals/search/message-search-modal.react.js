// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { type ChatMessageItem } from 'lib/selectors/chat-selectors.js';
import { useSearchMessages } from 'lib/shared/search-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './message-search-modal.css';
import { useParseSearchResults } from './message-search-utils.react.js';
import { useTooltipContext } from '../../chat/tooltip-provider.js';
import Button from '../../components/button.react.js';
import MessageResult from '../../components/message-result.react.js';
import Search from '../../components/search.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useMessageSearchContext } from '../../search/message-search-state-provider.react.js';
import Modal from '../modal.react.js';

type ContentProps = {
  +threadInfo: ThreadInfo,
};

function MessageSearchModal(props: ContentProps): React.Node {
  const { threadInfo } = props;

  const {
    getQuery,
    setQuery,
    clearQuery,
    getSearchResults,
    appendSearchResult,
    getEndReached,
    setEndReached,
  } = useMessageSearchContext();

  const loading = React.useRef(false);

  const searchResults = React.useMemo(
    () => getSearchResults(threadInfo.id),
    [getSearchResults, threadInfo.id],
  );

  const endReached = React.useMemo(
    () => getEndReached(threadInfo.id),
    [getEndReached, threadInfo.id],
  );

  const appendResults = React.useCallback(
    (newMessages: $ReadOnlyArray<RawMessageInfo>, end: boolean) => {
      appendSearchResult(newMessages, threadInfo.id);
      if (end) {
        setEndReached(threadInfo.id);
      }
      loading.current = false;
    },
    [appendSearchResult, setEndReached, threadInfo.id],
  );

  const searchMessages = useSearchMessages();

  const [input, setInput] = React.useState(getQuery(threadInfo.id));

  const onPressSearch = React.useCallback(() => {
    setQuery(input, threadInfo.id);
    loading.current = true;
    searchMessages(
      getQuery(threadInfo.id),
      threadInfo.id,
      appendResults,
      undefined,
    );
  }, [setQuery, input, searchMessages, getQuery, threadInfo.id, appendResults]);

  const onKeyDown = React.useCallback(
    event => {
      if (event.key === 'Enter') {
        onPressSearch();
      }
    },
    [onPressSearch],
  );

  const modifiedItems = useParseSearchResults(threadInfo, searchResults);

  const { clearTooltip } = useTooltipContext();

  const messageContainer = React.useRef(null);
  const messageContainerRef = (msgContainer: ?HTMLDivElement) => {
    messageContainer.current = msgContainer;
  };

  const possiblyLoadMoreMessages = React.useCallback(() => {
    if (!messageContainer.current) {
      return;
    }

    const loaderTopOffset = 32;
    const { scrollTop, scrollHeight, clientHeight } = messageContainer.current;
    if (
      endReached ||
      loading.current ||
      Math.abs(scrollTop) + clientHeight + loaderTopOffset < scrollHeight
    ) {
      return;
    }
    loading.current = true;
    const lastID = modifiedItems ? oldestMessageID(modifiedItems) : undefined;
    searchMessages(
      getQuery(threadInfo.id),
      threadInfo.id,
      appendResults,
      lastID,
    );
  }, [
    appendResults,
    endReached,
    getQuery,
    modifiedItems,
    searchMessages,
    threadInfo.id,
  ]);

  const onScroll = React.useCallback(() => {
    clearTooltip();
    possiblyLoadMoreMessages();
  }, [clearTooltip, possiblyLoadMoreMessages]);

  const renderItem = React.useCallback(
    item => (
      <MessageResult
        key={item.messageInfo.id}
        item={item}
        threadInfo={threadInfo}
        scrollable={false}
      />
    ),
    [threadInfo],
  );

  const messages = React.useMemo(
    () => modifiedItems.map(item => renderItem(item)),
    [modifiedItems, renderItem],
  );

  const footer = React.useMemo(() => {
    if (getQuery(threadInfo.id) === '') {
      return (
        <div className={css.footer}>Your search results will appear here</div>
      );
    }
    if (!endReached) {
      return (
        <div key="search-loader" className={css.loading}>
          <LoadingIndicator status="loading" size="medium" color="white" />
        </div>
      );
    }
    if (modifiedItems.length > 0) {
      return <div className={css.footer}>End of results</div>;
    }
    return (
      <div className={css.footer}>
        No results. Please try using different keywords to refine your search
      </div>
    );
  }, [getQuery, threadInfo.id, endReached, modifiedItems.length]);

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const searchPlaceholder = `Searching in ${uiName}`;
  const { popModal } = useModalContext();

  const clearQueryWrapper = React.useCallback(
    () => clearQuery(threadInfo.id),
    [clearQuery, threadInfo.id],
  );

  return (
    <Modal name="Search Message" onClose={popModal} size="large">
      <div className={css.container}>
        <div className={css.header}>
          <Search
            onChangeText={setInput}
            searchText={input}
            placeholder={searchPlaceholder}
            onClearText={clearQueryWrapper}
            onKeyDown={onKeyDown}
          />
          <Button
            onClick={onPressSearch}
            variant="filled"
            className={css.button}
          >
            Search
          </Button>
        </div>
        <div
          className={css.content}
          ref={messageContainerRef}
          onScroll={onScroll}
        >
          {messages}
          {footer}
        </div>
      </div>
    </Modal>
  );
}

function oldestMessageID(data: $ReadOnlyArray<ChatMessageItem>) {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].itemType === 'message' && data[i].messageInfo.id) {
      return data[i].messageInfo.id;
    }
  }
  return undefined;
}

export default MessageSearchModal;
