// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './message-search-modal.css';
import { useParseSearchResults } from './message-search-utils.react.js';
import Button from '../../components/button.react.js';
import MessageResult from '../../components/message-result.react.js';
import Search from '../../components/search.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useMessageSearchContext } from '../../search/message-search-state-provider.react.js';
import { useTooltipContext } from '../../tooltips/tooltip-provider.js';
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
    searchMessages,
    getSearchResults,
    getEndReached,
  } = useMessageSearchContext();

  const [input, setInput] = React.useState(getQuery(threadInfo.id));

  const onPressSearch = React.useCallback(() => {
    setQuery(input, threadInfo.id);
    searchMessages(threadInfo.id);
  }, [setQuery, input, searchMessages, threadInfo.id]);

  const onKeyDown = React.useCallback(
    (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        onPressSearch();
      }
    },
    [onPressSearch],
  );

  const modifiedItems = useParseSearchResults(
    threadInfo,
    getSearchResults(threadInfo.id),
  );

  const { clearTooltip } = useTooltipContext();

  const messageContainer = React.useRef<?HTMLDivElement>(null);

  const possiblyLoadMoreMessages = React.useCallback(() => {
    if (!messageContainer.current) {
      return;
    }

    const loaderTopOffset = 32;
    const { scrollTop, scrollHeight, clientHeight } = messageContainer.current;
    if (Math.abs(scrollTop) + clientHeight + loaderTopOffset < scrollHeight) {
      return;
    }
    searchMessages(threadInfo.id);
  }, [searchMessages, threadInfo.id]);

  const onScroll = React.useCallback(() => {
    clearTooltip();
    possiblyLoadMoreMessages();
  }, [clearTooltip, possiblyLoadMoreMessages]);

  const renderItem = React.useCallback(
    (item: ChatMessageInfoItem) => (
      <MessageResult
        key={chatMessageItemKey(item)}
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

  const endReached = getEndReached(threadInfo.id);
  const query = getQuery(threadInfo.id);

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

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const searchPlaceholder = `Searching in ${uiName}`;
  const { popModal } = useModalContext();

  const clearQueryWrapper = React.useCallback(
    () => clearQuery(threadInfo.id),
    [clearQuery, threadInfo.id],
  );

  return (
    <Modal name="Search messages" onClose={popModal} size="large">
      <div className={css.container}>
        <div className={css.header}>
          <div className={css.searchBarContainer}>
            <Search
              onChangeText={setInput}
              searchText={input}
              placeholder={searchPlaceholder}
              onClearText={clearQueryWrapper}
              onKeyDown={onKeyDown}
            />
          </div>
          <Button
            onClick={onPressSearch}
            variant="filled"
            className={css.button}
          >
            Search
          </Button>
        </div>
        <div className={css.content} ref={messageContainer} onScroll={onScroll}>
          {messages}
          {footer}
        </div>
      </div>
    </Modal>
  );
}

export default MessageSearchModal;
