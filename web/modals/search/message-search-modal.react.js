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
  +query: string,
  +threadInfo: ThreadInfo,
};

function MessageSearchModalContent(props: ContentProps): React.Node {
  const { query, threadInfo } = props;

  const [lastID, setLastID] = React.useState();
  const [searchResults, setSearchResults] = React.useState([]);
  const [endReached, setEndReached] = React.useState(false);

  const appendSearchResults = React.useCallback(
    (newMessages: $ReadOnlyArray<RawMessageInfo>, end: boolean) => {
      setSearchResults(oldMessages => [...oldMessages, ...newMessages]);
      setEndReached(end);
    },
    [],
  );

  React.useEffect(() => {
    setSearchResults([]);
    setLastID(undefined);
    setEndReached(false);
  }, [query]);

  const searchMessages = useSearchMessages();

  React.useEffect(
    () => searchMessages(query, threadInfo.id, appendSearchResults, lastID),
    [appendSearchResults, lastID, query, searchMessages, threadInfo.id],
  );

  const modifiedItems = useParseSearchResults(threadInfo, searchResults);

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

  const messageContainer = React.useRef(null);

  const messageContainerRef = (msgContainer: ?HTMLDivElement) => {
    messageContainer.current = msgContainer;
    messageContainer.current?.addEventListener('scroll', onScroll);
  };

  const { clearTooltip } = useTooltipContext();

  const possiblyLoadMoreMessages = React.useCallback(() => {
    if (!messageContainer.current) {
      return;
    }

    const loaderTopOffset = 32;
    const { scrollTop, scrollHeight, clientHeight } = messageContainer.current;
    if (
      endReached ||
      Math.abs(scrollTop) + clientHeight + loaderTopOffset < scrollHeight
    ) {
      return;
    }
    setLastID(modifiedItems ? oldestMessageID(modifiedItems) : undefined);
  }, [endReached, modifiedItems]);

  const onScroll = React.useCallback(() => {
    if (!messageContainer.current) {
      return;
    }
    clearTooltip();
    possiblyLoadMoreMessages();
  }, [clearTooltip, possiblyLoadMoreMessages]);

  const footer = React.useMemo(() => {
    if (query === '') {
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
  }, [query, endReached, modifiedItems.length]);

  return (
    <div className={css.content} ref={messageContainerRef}>
      {messages}
      {footer}
    </div>
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

type Props = {
  +threadInfo: ThreadInfo,
};

function MessageSearchModal(props: Props): React.Node {
  const { threadInfo } = props;
  const { popModal } = useModalContext();

  const { query, setQuery, clearQuery } = useMessageSearchContext();

  const [input, setInput] = React.useState(query);

  const onClearText = React.useCallback(() => clearQuery(), [clearQuery]);

  const onPressSearch = React.useCallback(
    () => setQuery(input),
    [setQuery, input],
  );

  const button = React.useMemo(() => {
    return (
      <Button onClick={onPressSearch} variant="filled" className={css.button}>
        Search
      </Button>
    );
  }, [onPressSearch]);

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const searchPlaceholder = `Searching in ${uiName}`;

  const onKeyDown = React.useCallback(
    event => {
      if (event.key === 'Enter') {
        onPressSearch();
      }
    },
    [onPressSearch],
  );

  return (
    <Modal name="Search Message" onClose={popModal} size="large">
      <div className={css.container}>
        <div className={css.header}>
          <Search
            onChangeText={setInput}
            searchText={input}
            placeholder={searchPlaceholder}
            onClearText={onClearText}
            onKeyDown={onKeyDown}
          />
          {button}
        </div>
        <MessageSearchModalContent threadInfo={threadInfo} query={query} />
      </div>
    </Modal>
  );
}

export default MessageSearchModal;
