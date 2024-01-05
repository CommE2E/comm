// @flow

import * as React from 'react';

import {
  fetchPinnedMessageActionTypes,
  useFetchPinnedMessages,
} from 'lib/actions/message-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import {
  messageListData,
  type ChatMessageInfoItem,
} from 'lib/selectors/chat-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  createMessageInfo,
  isInvalidPinSourceForThread,
  modifyItemForResultScreen,
} from 'lib/shared/message-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';
import { pinnedMessageCountText } from 'lib/utils/message-pinning-utils.js';

import css from './pinned-messages-modal.css';
import MessageResult from '../../components/message-result.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import Modal from '../modal.react.js';

type Props = {
  +threadInfo: ThreadInfo,
};

const loadingStatusSelector = createLoadingStatusSelector(
  fetchPinnedMessageActionTypes,
);

function PinnedMessagesModal(props: Props): React.Node {
  const { threadInfo } = props;
  const { id: threadID } = threadInfo;
  const { popModal } = useModalContext();
  const [rawMessageResults, setRawMessageResults] = React.useState<
    $ReadOnlyArray<RawMessageInfo>,
  >([]);

  const callFetchPinnedMessages = useFetchPinnedMessages();
  const dispatchActionPromise = useDispatchActionPromise();

  const userInfos = useSelector(state => state.userStore.userInfos);
  const loadingStatus = useSelector(loadingStatusSelector);

  React.useEffect(() => {
    void dispatchActionPromise(
      fetchPinnedMessageActionTypes,
      (async () => {
        const result = await callFetchPinnedMessages({ threadID });
        setRawMessageResults(result.pinnedMessages);
      })(),
    );
  }, [dispatchActionPromise, callFetchPinnedMessages, threadID]);

  const translatedMessageResults = React.useMemo(() => {
    const threadInfos = { [threadID]: threadInfo };

    return rawMessageResults
      .map(messageInfo =>
        createMessageInfo(messageInfo, null, userInfos, threadInfos),
      )
      .filter(Boolean);
  }, [rawMessageResults, userInfos, threadID, threadInfo]);

  const chatMessageInfos = useSelector(
    messageListData(threadInfo.id, translatedMessageResults),
  );

  const sortedUniqueChatMessageInfoItems = React.useMemo(() => {
    if (!chatMessageInfos) {
      return ([]: ChatMessageInfoItem[]);
    }

    const chatMessageInfoItems = chatMessageInfos.filter(
      item =>
        item.itemType === 'message' &&
        item.isPinned &&
        !isInvalidPinSourceForThread(item.messageInfo, threadInfo),
    );

    // By the nature of using messageListData and passing in
    // the desired translatedMessageResults as additional
    // messages, we will have duplicate ChatMessageInfoItems.
    const uniqueChatMessageInfoItemsMap = new Map<
      string,
      ChatMessageInfoItem,
    >();
    chatMessageInfoItems.forEach(
      item =>
        item.messageInfo &&
        item.messageInfo.id &&
        uniqueChatMessageInfoItemsMap.set(item.messageInfo.id, item),
    );

    // Push the items in the order they appear in the rawMessageResults
    // since the messages fetched from the server are already sorted
    // in the order of pin_time (newest first).
    const sortedChatMessageInfoItems = [];
    for (let i = 0; i < rawMessageResults.length; i++) {
      const rawMessageID = rawMessageResults[i].id;
      if (!rawMessageID) {
        continue;
      }
      sortedChatMessageInfoItems.push(
        uniqueChatMessageInfoItemsMap.get(rawMessageID),
      );
    }

    return sortedChatMessageInfoItems;
  }, [chatMessageInfos, rawMessageResults, threadInfo]);

  const modifiedItems = React.useMemo(
    () =>
      sortedUniqueChatMessageInfoItems
        .filter(Boolean)
        .map(item => modifyItemForResultScreen(item)),
    [sortedUniqueChatMessageInfoItems],
  );

  const messageResultsToDisplay = React.useMemo(() => {
    if (modifiedItems.length === 0) {
      return (
        <div className={css.noPinnedMessages}>
          No pinned messages in this thread.
        </div>
      );
    }

    const items = modifiedItems.map(item => (
      <MessageResult
        key={item.messageInfo.id}
        item={item}
        threadInfo={threadInfo}
        scrollable={false}
      />
    ));
    return <>{items}</>;
  }, [modifiedItems, threadInfo]);

  const loadingIndicator = React.useMemo(() => {
    if (loadingStatus === 'loading') {
      return (
        <div className={css.loadingIndicator}>
          <LoadingIndicator status="loading" size="medium" />
        </div>
      );
    }
    return null;
  }, [loadingStatus]);

  const modalName = pinnedMessageCountText(modifiedItems.length);

  return (
    <Modal name={modalName} onClose={popModal} size="large">
      <hr className={css.separator} />
      <div className={css.topSpace}>{loadingIndicator}</div>
      <div className={css.messageResultsContainer}>
        {messageResultsToDisplay}
      </div>
    </Modal>
  );
}

export default PinnedMessagesModal;
