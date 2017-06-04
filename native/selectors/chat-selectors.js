// @flow

import type { BaseAppState } from 'lib/types/redux-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { MessageInfo, MessageStore } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';

import { createSelector } from 'reselect';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import PropTypes from 'prop-types';

export type ChatThreadItem = {
  threadInfo: ThreadInfo,
  mostRecentMessageInfo?: MessageInfo,
  lastUpdatedTime: number,
};

const chatThreadItemPropType = PropTypes.shape({
  threadInfo: threadInfoPropType.isRequired,
  mostRecentMessageInfo: messageInfoPropType,
  lastUpdatedTime: PropTypes.number.isRequired,
});

const chatListData = createSelector(
  (state: BaseAppState) => state.threadInfos,
  (state: BaseAppState) => state.messageStore,
  (
    threadInfos: {[id: string]: ThreadInfo},
    messageStore: MessageStore,
  ): ChatThreadItem[] => _flow(
    _filter('authorized'),
    _map((threadInfo: ThreadInfo): ChatThreadItem => {
      const thread = messageStore.threads[threadInfo.id];
      if (!thread || thread.messageIDs.length === 0) {
        return { threadInfo, lastUpdatedTime: threadInfo.creationTime };
      }
      const mostRecentMessageInfo = messageStore.messages[thread.messageIDs[0]];
      return {
        threadInfo,
        mostRecentMessageInfo,
        lastUpdatedTime: mostRecentMessageInfo.time,
      };
    }),
    _orderBy("lastUpdatedTime")("desc"),
  )(threadInfos),
);

export {
  chatThreadItemPropType,
  chatListData,
};
