// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  toggleMessagePin,
  toggleMessagePinActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { RelativeUserInfo } from 'lib/types/user-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import css from './toggle-pin-modal.css';
import { MessageListContext } from '../../chat/message-list-types.js';
import Message from '../../chat/message.react.js';
import Button, { buttonThemes } from '../../components/button.react.js';
import { useTextMessageRulesFunc } from '../../markdown/rules.react.js';
import Modal from '../modal.react.js';

type TogglePinModalProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function TogglePinModal(props: TogglePinModalProps): React.Node {
  const { item, threadInfo } = props;
  const { messageInfo, isPinned } = item;
  const { creator } = messageInfo;
  const { popModal } = useModalContext();

  const callToggleMessagePin = useServerCall(toggleMessagePin);
  const dispatchActionPromise = useDispatchActionPromise();

  const modalName = isPinned ? 'Remove Pinned Message' : 'Pin Message';
  const action = isPinned ? 'unpin' : 'pin';
  const confirmationText = isPinned
    ? `Are you sure you want to remove this pinned message?`
    : `You may pin this message to the channel you are currently viewing. 
       To unpin a message, select the pinned messages icon in the channel. `;
  const buttonText = isPinned ? 'Remove Pinned Message' : 'Pin Message';
  const buttonColor = isPinned ? buttonThemes.danger : buttonThemes.standard;

  const getTextMessageMarkdownRules = useTextMessageRulesFunc(threadInfo);
  const messageListContext = React.useMemo(() => {
    if (!getTextMessageMarkdownRules) {
      return undefined;
    }
    return { getTextMessageMarkdownRules };
  }, [getTextMessageMarkdownRules]);

  const creatorWithViewerFalse: RelativeUserInfo = React.useMemo(() => {
    return {
      ...creator,
      isViewer: false,
    };
  }, [creator]);
  const shouldShowUsername = !item.startsConversation && !item.startsCluster;
  const username = useStringForUser(
    shouldShowUsername ? creatorWithViewerFalse : null,
  );

  const shouldShowDate = !item.startsConversation;
  const messageDate = shouldShowDate ? (
    <div className={css.messageDate}>
      {longAbsoluteDate(item.messageInfo.time)}
    </div>
  ) : null;

  // ChatMessageInfoItem is a union type, and both types have different
  // properties, so creating a new item by just using the ... operator
  // results in Flow errors. Here, we check if the item is composable
  // (the only item types that can be pinned), and if so we modify the
  // creator to be 'creatorWithViewerFalse', which is the same creator except
  // with the isViewer property to be false. This is so the message is
  // rendered left-aligned and the creator's name is shown (per the designs).
  // If the item is not composable, we just return the item as is. We
  // also set the threadCreatedFromMessage property to undefined and
  // the reactions property to an empty array, to remove the inline
  // engagement bar from the message within the modal.
  const modifiedItem = React.useMemo(() => {
    if (item.messageInfoType === 'composable') {
      return {
        ...item,
        threadCreatedFromMessage: undefined,
        reactions: {},
        messageInfo: {
          ...item.messageInfo,
          creator: creatorWithViewerFalse,
        },
      };
    } else {
      return item;
    }
  }, [item, creatorWithViewerFalse]);

  const onClick = React.useCallback(() => {
    const toggleMessagePinPromise = (async () => {
      invariant(messageInfo.id, 'messageInfo.id should be defined');
      const result = await callToggleMessagePin({
        messageID: messageInfo.id,
        action,
      });
      return {
        newMessageInfos: result.newMessageInfos,
        threadID: result.threadID,
      };
    })();

    dispatchActionPromise(toggleMessagePinActionTypes, toggleMessagePinPromise);
    popModal();
  }, [
    action,
    callToggleMessagePin,
    dispatchActionPromise,
    messageInfo.id,
    popModal,
  ]);

  return (
    <Modal name={modalName} onClose={popModal} size="large">
      <div className={css.confirmationText}>{confirmationText}</div>
      <div className={css.messageContainer}>
        <div>
          {messageDate}
          <div className={css.creator}>{username}</div>
          <div className={css.messageContent}>
            <MessageListContext.Provider value={messageListContext}>
              <Message
                item={modifiedItem}
                threadInfo={threadInfo}
                key={messageInfo.id}
              />
            </MessageListContext.Provider>
          </div>
        </div>
      </div>
      <div className={css.buttonContainer}>
        <Button variant="filled" buttonColor={buttonColor} onClick={onClick}>
          {buttonText}
        </Button>
        <div className={css.cancelButton} onClick={popModal}>
          Cancel
        </div>
      </div>
    </Modal>
  );
}

export default TogglePinModal;
