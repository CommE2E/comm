// @flow

import invariant from 'invariant';
import * as React from 'react';

import { fetchPinnedMessages } from 'lib/actions/message-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { messageListData } from 'lib/selectors/chat-selectors.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import css from './thread-pinned-messages-modal.css';
import PinnedMessage from '../../components/pinned-message.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import Modal from '../modal.react.js';

type ThreadPinnedMessagesModalProps = {
  +threadInfo: ThreadInfo,
  +modalName: string,
};

function ThreadPinnedMessagesModal(
  props: ThreadPinnedMessagesModalProps,
): React.Node {
  const { threadInfo, modalName } = props;
  const { id: threadID } = threadInfo;
  const { popModal } = useModalContext();
  const [rawPinnedMessages, setRawPinnedMessages] = React.useState([]);
  const callFetchPinnedMessages = useServerCall(fetchPinnedMessages);

  const userInfos = useSelector(state => state.userStore.userInfos);

  React.useEffect(() => {
    (async () => {
      const result = await callFetchPinnedMessages({ threadID });
      setRawPinnedMessages(result.pinnedMessages);
    })();
  }, [callFetchPinnedMessages, threadID]);

  const translatedPinnedMessageInfos = React.useMemo(() => {
    const threadInfos = { [threadID]: threadInfo };

    return rawPinnedMessages
      .map(messageInfo =>
        createMessageInfo(messageInfo, null, userInfos, threadInfos),
      )
      .filter(Boolean);
  }, [rawPinnedMessages, userInfos, threadID, threadInfo]);

  const chatMessageInfos = useSelector(
    messageListData(threadInfo.id, translatedPinnedMessageInfos),
  );

  const sortedUniqueChatMessageInfoItems = React.useMemo(() => {
    if (!chatMessageInfos) {
      return [];
    }

    const chatMessageInfoItems = chatMessageInfos.filter(
      item => item.itemType === 'message' && item.isPinned,
    );

    // By the nature of using messageListData and passing in
    // the desired translatedPinnedMessageInfos as additional
    // messages, we will have duplicate ChatMessageInfoItems.
    const uniqueChatMessageInfoItemsMap = new Map();
    chatMessageInfoItems.map(
      item =>
        item.messageInfo &&
        item.messageInfo.id &&
        uniqueChatMessageInfoItemsMap.set(item.messageInfo.id, item),
    );

    // Sort uniqueChatMessageInfoItems based on the order of
    // their appearance in rawPinnedMessages (since the messages from the server
    // are already sorted by their pin_time in descending order).
    const sortedChatMessageInfoItems = [];
    for (let i = 0; i < rawPinnedMessages.length; i++) {
      sortedChatMessageInfoItems.push(
        uniqueChatMessageInfoItemsMap.get(rawPinnedMessages[i].id),
      );
    }

    return sortedChatMessageInfoItems;
  }, [chatMessageInfos, rawPinnedMessages]);

  const modifiedItems = React.useMemo(
    () =>
      sortedUniqueChatMessageInfoItems.map(item => {
        invariant(item, 'item should not be null');

        // We need to modify the item to make sure that the message does
        // not render with the date header and that the creator
        // is not considered the viewer.
        let modifiedItem = item;
        if (item.messageInfoType === 'composable') {
          modifiedItem = {
            ...item,
            startsConversation: false,
            messageInfo: {
              ...item.messageInfo,
              creator: {
                ...item.messageInfo.creator,
                isViewer: false,
              },
            },
          };
        }
        return modifiedItem;
      }),
    [sortedUniqueChatMessageInfoItems],
  );

  const pinnedMessagesToDisplay = React.useMemo(
    () =>
      modifiedItems.map(item => (
        <PinnedMessage
          key={item.messageInfo.id}
          item={item}
          threadInfo={threadInfo}
        />
      )),
    [modifiedItems, threadInfo],
  );

  return (
    <Modal name={modalName} onClose={popModal} size="large">
      <hr className={css.separator} />
      <div className={css.pinnedMessagesContainer}>
        {pinnedMessagesToDisplay}
      </div>
    </Modal>
  );
}

export default ThreadPinnedMessagesModal;
