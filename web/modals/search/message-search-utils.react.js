// @flow

import * as React from 'react';

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { messageListData } from 'lib/selectors/chat-selectors.js';
import {
  createMessageInfo,
  modifyItemForResultScreen,
} from 'lib/shared/message-utils.js';
import { filterChatMessageInfosForSearch } from 'lib/shared/search-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

import { useSelector } from '../../redux/redux-utils.js';

function useParseSearchResults(
  threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  searchResults: $ReadOnlyArray<RawMessageInfo>,
): $ReadOnlyArray<ChatMessageInfoItem> {
  const userInfos = useSelector(state => state.userStore.userInfos);

  const translatedSearchResults = React.useMemo(() => {
    const threadInfos = { [threadInfo.id]: threadInfo };
    return searchResults
      .map(rawMessageInfo =>
        createMessageInfo(rawMessageInfo, null, userInfos, threadInfos),
      )
      .filter(Boolean);
  }, [searchResults, threadInfo, userInfos]);

  const chatMessageInfos = useSelector(
    messageListData(threadInfo.id, translatedSearchResults),
  );

  const filteredChatMessageInfos = React.useMemo(
    () =>
      filterChatMessageInfosForSearch(
        chatMessageInfos,
        translatedSearchResults,
      ) ?? [],
    [chatMessageInfos, translatedSearchResults],
  );

  return React.useMemo(
    () => filteredChatMessageInfos.map(item => modifyItemForResultScreen(item)),
    [filteredChatMessageInfos],
  );
}

export { useParseSearchResults };
