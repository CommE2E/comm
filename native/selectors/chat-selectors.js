// @flow

import type { BaseAppState } from 'lib/types/redux-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { MessageStore } from 'lib/types/message-types';

import { createSelector } from 'reselect';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import PropTypes from 'prop-types';

export type ChatThreadItem = {
  threadInfo: ThreadInfo,
  lastUpdatedTime: number,
};

const chatThreadItemPropType = PropTypes.shape({
  threadInfo: threadInfoPropType.isRequired,
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
    _map((threadInfo: ThreadInfo) => {
      const messageIDs = messageStore.threads[threadInfo.id].messageIDs;
      const lastUpdatedTime = messageIDs.length === 0
        ? threadInfo.creationTime
        : messageStore.messages[messageIDs[0]].time;
      return { threadInfo, lastUpdatedTime };
    }),
    _orderBy("lastUpdatedTime")("desc"),
  )(threadInfos),
);

export {
  chatThreadItemPropType,
  chatListData,
};
