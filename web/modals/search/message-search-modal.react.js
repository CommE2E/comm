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
    searchResults,
    appendSearchResult,
    endReached,
    setEndReached,
  } = useMessageSearchContext();

  const loading = React.useRef(false);

  const appendResults = React.useCallback(
    (newMessages: $ReadOnlyArray<RawMessageInfo>, end: boolean) => {
      appendSearchResult(newMessages);
      if (end) {
        setEndReached();
      }
      loading.current = false;
    },
    [appendSearchResult, setEndReached],
  );

  const searchMessages = useSearchMessages();

  const [input, setInput] = React.useState(getQuery());

  const onPressSearch = React.useCallback(() => {
    setQuery(input);
    loading.current = true;
    searchMessages(getQuery(), threadInfo.id, appendResults, undefined);
  }, [setQuery, input, searchMessages, getQuery, threadInfo.id, appendResults]);

  const button = React.useMemo(() => {
    return (
      <Button onClick={onPressSearch} variant="filled" className={css.button}>
        Search
      </Button>
    );
  }, [onPressSearch]);

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
    searchMessages(getQuery(), threadInfo.id, appendResults, lastID);
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
    if (getQuery() === '') {
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
  }, [getQuery, endReached, modifiedItems.length]);

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const searchPlaceholder = `Searching in ${uiName}`;
  const { popModal } = useModalContext();

  return (
    <Modal name="Search Message" onClose={popModal} size="large">
      <div className={css.container} onKeyDown={onKeyDown}>
        <div className={css.header}>
          <Search
            onChangeText={setInput}
            searchText={input}
            placeholder={searchPlaceholder}
            onClearText={clearQuery}
          />
          {button}
        </div>
        <div
          className={css.content}
          ref={messageContainerRef}
          onScroll={onScroll}
        >
          {messages}
          {footer}
        </div>{' '}
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
