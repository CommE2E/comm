// @flow

import * as React from 'react';

import {
  fetchPinnedMessages,
  fetchPinnedMessageActionTypes,
} from 'lib/actions/message-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { messageListData } from 'lib/selectors/chat-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  createMessageInfo,
  modifyItemForResultScreen,
} from 'lib/shared/message-utils.js';
import { isComposableMessageType } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import css from './message-results-modal.css';
import MessageResult from '../../components/message-result.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import Modal from '../modal.react.js';

type MessageResultsModalProps = {
  +threadInfo: ThreadInfo,
  +modalName: string,
};

const loadingStatusSelector = createLoadingStatusSelector(
  fetchPinnedMessageActionTypes,
);

function MessageResultsModal(props: MessageResultsModalProps): React.Node {
  const { threadInfo, modalName } = props;
  const { id: threadID } = threadInfo;
  const { popModal } = useModalContext();
  const [rawMessageResults, setRawMessageResults] = React.useState([]);

  const callFetchPinnedMessages = useServerCall(fetchPinnedMessages);
  const dispatchActionPromise = useDispatchActionPromise();

  const userInfos = useSelector(state => state.userStore.userInfos);
  const loadingStatus = useSelector(loadingStatusSelector);

  React.useEffect(() => {
    dispatchActionPromise(
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
      return [];
    }

    const chatMessageInfoItems = chatMessageInfos.filter(
      item =>
        item.itemType === 'message' &&
        item.isPinned &&
        isComposableMessageType(item.messageInfo.type),
    );

    // By the nature of using messageListData and passing in
    // the desired translatedMessageResults as additional
    // messages, we will have duplicate ChatMessageInfoItems.
    const uniqueChatMessageInfoItemsMap = new Map();
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
      sortedChatMessageInfoItems.push(
        uniqueChatMessageInfoItemsMap.get(rawMessageResults[i].id),
      );
    }

    return sortedChatMessageInfoItems;
  }, [chatMessageInfos, rawMessageResults]);

  const modifiedItems = React.useMemo(
    () =>
      sortedUniqueChatMessageInfoItems
        .filter(Boolean)
        .map(item => modifyItemForResultScreen(item)),
    [sortedUniqueChatMessageInfoItems],
  );

  const messageResultsToDisplay = React.useMemo(() => {
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

export default MessageResultsModal;
