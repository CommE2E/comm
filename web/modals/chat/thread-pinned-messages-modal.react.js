// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types.js';
import { fetchPinnedMessages } from 'lib/actions/message-actions.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import { useServerCall } from 'lib/utils/action-utils.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { messageListData } from 'lib/selectors/chat-selectors.js';

import Modal from '../modal.react.js';
import css from './thread-pinned-messages-modal.css';
import PinnedMessage from '../../components/pinned-message.react.js';
import { useSelector } from '../../redux/redux-utils.js';

type ThreadPinnedMessagesModalProps = {
  +threadInfo: ThreadInfo,
};

function ThreadPinnedMessagesModal(
  props: ThreadPinnedMessagesModalProps,
): React.Node {
  const { threadInfo } = props;
  const { id: threadID } = threadInfo;
  const { popModal } = useModalContext();
  const [rawPinnedMessages, setRawPinnedMessages] = React.useState([]);
  const callFetchPinnedMessages = useServerCall(fetchPinnedMessages);

  const userInfos = useSelector(state => state.userStore.userInfos);

  invariant(threadInfo.pinnedCount, 'pinnedCount should be a defined property');
  const singleOrPlural = threadInfo.pinnedCount === 1 ? 'message' : 'messages';
  const modalName = `${threadInfo.pinnedCount} pinned ${singleOrPlural}`;

  React.useEffect(() => {
    (async () => {
      const result = await callFetchPinnedMessages({ threadID });
      setRawPinnedMessages(result.pinnedMessages);
    })();
  }, [callFetchPinnedMessages, threadID]);

  const translatedPinnedMessageInfos = React.useMemo(() => {
    const threadInfos = { [threadID]: threadInfo };

    return rawPinnedMessages
      .map(messageInfo => {
        return createMessageInfo(messageInfo, null, userInfos, threadInfos);
      })
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
      item =>
        item.itemType === 'message' &&
        item.messageInfoType === 'composable' &&
        item.isPinned,
    );

    // By the nature of using messageListData and passing in
    // the desired translatedPinnedMessageInfos as additional
    // messages, we will have duplicate ChatMessageInfoItems. This
    // removes any duplicates (identified by messageInfo.id).
    const uniqueChatMessageInfoItems = chatMessageInfoItems.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          otherItem =>
            otherItem.messageInfo &&
            otherItem.messageInfo.id === item.messageInfo?.id,
        ),
    );

    // Sort uniqueChatMessageInfoItems by messageInfo.id based on the order of
    // their appearance in rawPinnedMessages (since the messages from the server
    // are already sorted by their pin_time in descending order).
    return uniqueChatMessageInfoItems.sort((a, b) => {
      const aIndex = rawPinnedMessages.findIndex(
        message => message.id === a.messageInfo?.id,
      );

      const bIndex = rawPinnedMessages.findIndex(
        message => message.id === b.messageInfo?.id,
      );

      return aIndex - bIndex;
    });
  }, [chatMessageInfos, rawPinnedMessages]);

  const modifiedItems = React.useMemo(() => {
    return sortedUniqueChatMessageInfoItems.map(item => {
      invariant(item.itemType !== 'loader', 'loader should not be displayed');

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
    });
  }, [sortedUniqueChatMessageInfoItems]);

  const pinnedMessagesToDisplay = React.useMemo(() => {
    return modifiedItems.map(item => {
      return (
        <PinnedMessage
          key={item.messageInfo.id}
          item={item}
          threadInfo={threadInfo}
        />
      );
    });
  }, [modifiedItems, threadInfo]);

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
