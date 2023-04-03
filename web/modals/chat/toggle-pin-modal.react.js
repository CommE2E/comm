// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  toggleMessagePin,
  toggleMessagePinActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import css from './toggle-pin-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import PinnedMessage from '../../components/pinned-message.react.js';
import Modal from '../modal.react.js';

type TogglePinModalProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function TogglePinModal(props: TogglePinModalProps): React.Node {
  const { item, threadInfo } = props;
  const { messageInfo, isPinned } = item;
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

  // We want to remove inline engagement (threadCreatedFromMessage / reactions)
  // and the message header (startsConversation). We also want to set isViewer
  // to false so that the message is left-aligned and uncolored.
  const modifiedItem = React.useMemo(() => {
    if (item.messageInfoType === 'composable') {
      return {
        ...item,
        threadCreatedFromMessage: undefined,
        reactions: {},
        startsConversation: false,
        messageInfo: {
          ...item.messageInfo,
          creator: {
            ...item.messageInfo.creator,
            isViewer: false,
          },
        },
      };
    } else {
      return item;
    }
  }, [item]);

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
      <PinnedMessage item={modifiedItem} threadInfo={threadInfo} />
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
